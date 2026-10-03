"""
server.py — Sazon AI Agent Modern Web Server
FastAPI server hosting static Web UI and REST API for real-time agent execution.
"""

import os
import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import GoalRequest, SazonExecutor, TaskStatus, default_registry, AgentState, ExecutionStep
from config import DEFAULT_HOST, DEFAULT_PORT

logger = logging.getLogger("sazon.server")

app = FastAPI(title="Sazon AI Agent Dashboard", version="2.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active execution streams and status
_active_execution: Dict[str, Any] = {
    "is_running": False,
    "current_goal": None,
    "subtasks": [],
    "steps": [],
    "logs": [],
    "final_result": None
}

_event_subscribers: List[asyncio.Queue] = []


def _broadcast_event(event_type: str, data: Dict[str, Any]):
    """Broadcast real-time event to all SSE subscribers."""
    payload = {
        "event": event_type,
        "data": data
    }
    _active_execution["logs"].append(payload)
    
    # Broadcast to active queues
    for queue in list(_event_subscribers):
        try:
            queue.put_nowait(payload)
        except Exception:
            pass


def _get_ollama_models() -> List[Dict[str, Any]]:
    """Query local Ollama server if available."""
    try:
        import urllib.request
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = []
            for m in data.get("models", []):
                name = m.get("name", "")
                models.append({
                    "id": f"ollama/{name}",
                    "name": f"🦙 Ollama: {name} (Local - No Key)",
                    "provider": "ollama",
                    "model": name,
                    "badge": "Local (Free)",
                    "category": "local"
                })
            return models
    except Exception:
        return []


@app.get("/api/health")
def health_check():
    """Health diagnostic endpoint."""
    ollama_models = _get_ollama_models()
    return {
        "status": "online",
        "agent": "Sazon Autonomous AI Assistant",
        "version": "2.1.0",
        "tools_registered": [t["name"] for t in default_registry.list_tools()],
        "has_openrouter_key": bool(os.getenv("OPENROUTER_API_KEY")),
        "has_gemini_key": bool(os.getenv("GEMINI_API_KEY")),
        "has_openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "ollama_available": len(ollama_models) > 0,
        "ollama_models": [m["model"] for m in ollama_models],
        "zero_key_mode_ready": True
    }


@app.get("/api/models")
def list_models():
    """Available LLM presets including Ollama local models and cloud providers."""
    local_models = [
        {"id": "sample/sazon", "name": "🤖 Sazon Smart Local Engine (Offline / No Key)", "provider": "sample", "model": "sazon", "badge": "Offline", "category": "local"},
    ]

    # Query Ollama dynamically
    ollama_list = _get_ollama_models()
    if ollama_list:
        local_models.extend(ollama_list)
    else:
        # Provide placeholder option so users know how to use it
        local_models.append({"id": "ollama/llama3.2", "name": "🦙 Ollama: llama3.2 (Start Ollama locally)", "provider": "ollama", "model": "llama3.2", "badge": "Local", "category": "local"})

    cloud_models = [
        {"id": "openrouter/gemini-flash-free", "name": "🆓 OpenRouter: Gemini 2.0 Flash (Free)", "provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "badge": "Free", "category": "free"},
        {"id": "openrouter/deepseek-r1", "name": "🧠 OpenRouter: DeepSeek R1", "provider": "openrouter", "model": "deepseek/deepseek-r1", "badge": "OpenRouter", "category": "cloud"},
        {"id": "openrouter/claude-3.5-sonnet", "name": "⚡ OpenRouter: Claude 3.5 Sonnet", "provider": "openrouter", "model": "anthropic/claude-3.5-sonnet", "badge": "OpenRouter", "category": "cloud"},
        {"id": "openrouter/llama-3.3-70b", "name": "🦙 OpenRouter: Llama 3.3 70B", "provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct", "badge": "OpenRouter", "category": "cloud"},
        {"id": "gemini/gemini-2.5-flash", "name": "⚡ Google Gemini 2.5 Flash", "provider": "gemini", "model": "gemini-2.5-flash", "badge": "Google", "category": "cloud"},
        {"id": "gemini/gemini-1.5-pro", "name": "🧠 Google Gemini 1.5 Pro", "provider": "gemini", "model": "gemini-1.5-pro", "badge": "Google", "category": "cloud"},
        {"id": "openai/gpt-4o-mini", "name": "🚀 OpenAI GPT-4o Mini", "provider": "openai", "model": "gpt-4o-mini", "badge": "OpenAI", "category": "cloud"},
        {"id": "openai/gpt-4o", "name": "🔥 OpenAI GPT-4o", "provider": "openai", "model": "gpt-4o", "badge": "OpenAI", "category": "cloud"},
    ]

    return {"models": local_models + cloud_models}


def _run_agent_thread(req: GoalRequest):
    """Executes SazonExecutor in background thread with live event broadcasting."""
    _active_execution["is_running"] = True
    _active_execution["current_goal"] = req.goal
    _active_execution["subtasks"] = []
    _active_execution["steps"] = []
    _active_execution["logs"] = []
    _active_execution["final_result"] = None

    _broadcast_event("start", {"goal": req.goal, "provider": req.llm_provider, "model": req.model})

    def step_callback(state: AgentState, step: Optional[ExecutionStep]):
        _active_execution["subtasks"] = [t.model_dump(mode="json") for t in state.subtasks]
        if step:
            step_data = step.model_dump(mode="json")
            _active_execution["steps"].append(step_data)
            _broadcast_event("step", {
                "step": step_data,
                "subtasks": _active_execution["subtasks"]
            })
        else:
            _broadcast_event("plan", {
                "subtasks": _active_execution["subtasks"]
            })

    try:
        executor = SazonExecutor(goal_request=req, step_callback=step_callback)
        result = executor.run()
        res_data = result.model_dump(mode="json")
        _active_execution["final_result"] = res_data
        _broadcast_event("complete", res_data)
    except Exception as e:
        logger.error(f"Error executing agent goal: {e}")
        _broadcast_event("error", {"error": str(e)})
    finally:
        _active_execution["is_running"] = False


@app.post("/api/execute")
def execute_goal(req: GoalRequest, background_tasks: BackgroundTasks):
    """Trigger execution of an autonomous AI goal."""
    if _active_execution["is_running"]:
        raise HTTPException(status_code=400, detail="An execution is already in progress.")

    background_tasks.add_task(_run_agent_thread, req)
    return {"status": "accepted", "goal": req.goal}


@app.get("/api/stream")
async def event_stream():
    """SSE endpoint for streaming real-time execution steps and logs."""
    queue = asyncio.Queue()
    _event_subscribers.append(queue)

    async def sse_generator():
        try:
            # Yield initial status
            yield f"data: {json.dumps({'event': 'status', 'data': _active_execution}, default=str)}\n\n"
            while True:
                payload = await queue.get()
                yield f"data: {json.dumps(payload, default=str)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in _event_subscribers:
                _event_subscribers.remove(queue)

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@app.get("/api/status")
def get_status():
    """Get current active execution status."""
    return _active_execution


# Mount static web directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", response_class=HTMLResponse)
def root():
    """Serve index.html landing page."""
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("<h1>Sazon Web UI Initializing...</h1>", status_code=200)


def start_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
    """Run uvicorn server instance."""
    import uvicorn
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    start_server()
