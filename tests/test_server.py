import pytest
from fastapi.testclient import TestClient
from server import app
from agent import LLMClient

client = TestClient(app)

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "tools_registered" in data

def test_api_models():
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) >= 5
    providers = [m["provider"] for m in data["models"]]
    assert "openrouter" in providers
    assert "sample" in providers

def test_openrouter_llm_client_fallback():
    # Without key, openrouter client should gracefully fallback
    llm = LLMClient(provider="openrouter", model="deepseek/deepseek-r1")
    res = llm.generate("Hello Sazon")
    assert "Sazon" in res or "Hello" in res
