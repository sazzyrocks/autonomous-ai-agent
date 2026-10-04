# 🤖 Sazon — Autonomous AI Laptop Assistant v2.2

**Sazon** is a modern, high-performance autonomous AI desktop mascot and assistant for your laptop. Powered by **Framer Motion spring physics**, sleek glassmorphic aesthetics, real-time SSE streaming, and **100% Zero-API-Key local execution (Ollama & Offline Engine)**.

> **"Hello! Sazon is here, how may I help you today?"**

---

## ✨ Features & Next-Gen UI/UX

- 🎭 **Framer Motion Spring Physics**: Fluid micro-interactions, staggered card entrances, springy progress indicators, and interactive mascot orb reaction states.
- 🦙 **100% Zero API Key Local Execution**:
  - **Ollama Integration**: Autodetects local models (`gemma4`, `llama3.2`, `mistral`, `deepseek-r1`) via `localhost:11434` with zero API keys or external internet required.
  - **Sazon Smart Local Engine**: Built-in offline task planner and system executor for real laptop automation.
  - **Free Cloud Models**: Direct support for OpenRouter free models (`Gemini 2.0 Flash Free`).
- ⚡ **Command Palette (`Ctrl + K` / `Cmd + K`)**: Raycast/Linear-style spotlight search for quick actions, system diagnostics, model switching, export, and history.
- 📊 **Live Hardware Telemetry Bar**: Real-time meters for laptop CPU load, RAM usage, and Disk space.
- 📜 **Execution History & Re-run Drawer**: Automatically saves previous execution runs in a slide-over panel with 1-click re-run.
- 📄 **Export Reports (Markdown & JSON)**: One-click export of structured task reports with subtasks, tool execution steps, observations, and timestamps.
- 🔊 **Synthesizer Audio Feedback**: Web Audio API micro-chimes for clicks, execution start, subtask completion, and goal success (with mute toggle).
- 🤖 **Floating Mascot Companion Mode**: Minimize Sazon into a cute floating mascot widget with speech bubble greeting in the corner of your screen.
- 💻 **Laptop Task Automation Tools**: Hardware inspection, file search, directory creation, file read/write, browser/app launching, shell command execution, and math evaluation.

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/SajalPorey/autonomous-ai-agent.git
cd autonomous-ai-agent
pip install -r requirements.txt
```

### 2. Zero-API-Key Mode (No Setup Required!)

You can run Sazon **without any API keys**:

- **Option A (Ollama - Recommended):** If you have Ollama installed, run `ollama serve` and Sazon will automatically detect your local models (e.g. `gemma4:e4b`, `llama3.2`).
- **Option B (Built-in Offline Engine):** Select **🤖 Sazon Smart Local Engine (Offline / No Key)** in the dropdown. It automates local laptop tools completely offline.
- **Option C (Cloud Keys - Optional):** Copy `.env.example` to `.env` and configure `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY`.

### 3. Launch Modes

- **📱 Desktop App Window (pywebview):**
  ```bash
  python run.py
  # or: python run.py --app
  ```

- **🌐 Web Dashboard (Browser):**
  ```bash
  python run.py --web
  ```
  *Opens in default browser on `http://127.0.0.1:8000`.*

- **🖥️ Legacy Tkinter GUI:**
  ```bash
  python run.py --gui
  ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Command Palette |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Execute Current Goal |
| <kbd>Esc</kbd> | Close Modal / Drawer / Palette |

---

## 🛠️ Built-in Laptop Tools

- 💻 `system_info`: Inspect CPU load %, RAM usage, Disk space, OS, and Python environment.
- 🔍 `file_search`: Search files across directories with wildcard patterns.
- 📁 `create_folder`: Create directories.
- 📄 `file_read` & `file_write`: Read or write local files.
- 🌐 `open_app_or_url`: Launch local applications or web URLs.
- ⚡ `run_terminal_command`: Execute shell commands safely.
- 🧮 `calculate`: Evaluate mathematical and arithmetic expressions.

---

## 🧪 Testing

Run automated pytest test suite:

```bash
python -m pytest
```