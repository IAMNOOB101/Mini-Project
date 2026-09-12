"""
Ollama service — Python port of ollama.service.js
Wraps the Ollama Python SDK for chat completions.
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

MODEL = getattr(settings, "OLLAMA_MODEL", "qwen2.5-coder:14b")


def generate_ollama_response(prompt: str, temperature: float = 0.7, num_ctx: int = 8192) -> str:
    """
    Send a prompt to the local Ollama instance and return the response text.
    Equivalent to generateOllamaResponse() in ollama.service.js.
    """
    import ollama  # lazy import so server starts even if ollama is not installed

    client = ollama.Client(host=getattr(settings, "OLLAMA_HOST", "http://localhost:11434"))
    response = client.chat(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={
            "temperature": temperature,
            "num_ctx": num_ctx,
        },
    )
    return response["message"]["content"]
