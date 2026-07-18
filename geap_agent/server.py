"""FastAPI server exposing GEAP agent tree via REST + SSE streaming.

Session and memory are persisted in Cloud Firestore.

Usage:
    python -m geap_agent.server

Requires a Firestore database in the target GCP project:
    gcloud firestore databases create --location=us-west1

Authentication:
    Local:  gcloud auth application-default login
    Cloud Run:  default service account (auto)
"""

import json
import logging
import os

from pathlib import Path

from dotenv import load_dotenv

# .env lives next to this file
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse
from google.adk.integrations.firestore.firestore_memory_service import (
    FirestoreMemoryService,
)
from google.adk.integrations.firestore.firestore_session_service import (
    FirestoreSessionService,
)
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.cloud import firestore
from google.genai import types
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from geap_agent.agents.supervisor import root_agent

# ── Logging ──────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── ADK Services (singletons, server-lifetime) ──────────────────

_db_client = firestore.AsyncClient(database="geap-agent")
session_service = FirestoreSessionService(client=_db_client)
memory_service = FirestoreMemoryService(client=_db_client)

runner = Runner(
    agent=root_agent,
    app_name="geap",
    session_service=session_service,
    memory_service=memory_service,
    auto_create_session=True,
)

# ── FastAPI App ─────────────────────────────────────────────────

app = FastAPI(
    title="GEAP Agent API",
    version="1.0.0",
    description="Financial advisor multi-agent system powered by Google ADK.",
)


# ── Helpers ─────────────────────────────────────────────────────

def _error_response(status: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": detail})


def _sse(event_type: str, **data) -> dict:
    return {
        "event": "message",
        "data": json.dumps({"type": event_type, **data}),
    }


# ── Models ──────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


# ── Endpoint: POST /api/chat (SSE stream) ───────────────────────

@app.post("/api/chat")
async def chat_endpoint(
    body: ChatRequest,
    x_user_id: str = Header(...),
    x_session_id: str = Header(...),
):
    message = body.message.strip()
    if not message:
        return _error_response(400, "'message' field cannot be empty")

    content = types.Content(role="user", parts=[types.Part(text=message)])

    async def event_generator():
        try:
            async for event in runner.run_async(
                user_id=x_user_id,
                session_id=x_session_id,
                new_message=content,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            ):
                if not event.content or not event.content.parts:
                    continue

                for part in event.content.parts:
                    if part.text:
                        if event.partial:
                            yield _sse("text", content=part.text)
                    elif part.function_call:
                        yield _sse(
                            "tool_call",
                            name=part.function_call.name,
                            args=part.function_call.args,
                        )
                    elif part.function_response:
                        yield _sse(
                            "tool_result",
                            name=part.function_response.name,
                            content=part.function_response.response,
                        )

            yield _sse("done")
        except Exception:
            logger.exception("Unhandled error during agent streaming")
            yield _sse("error", content="Internal streaming error")

    return EventSourceResponse(event_generator())


# ── Health ───────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "geap-agent-api"}


# ── Debug: non-streaming chat test ──────────────────────────────

@app.post("/api/chat/test")
async def chat_test(body: ChatRequest):
    """Non-streaming chat endpoint for debugging. Returns full response as JSON."""
    import asyncio

    content = types.Content(role="user", parts=[types.Part(text=body.message)])

    full_text = ""
    try:
        events = []
        async with asyncio.timeout(60):
            async for event in runner.run_async(
                user_id="debug",
                session_id="debug",
                new_message=content,
            ):
                events.append(event)

        for event in events:
            if event.partial or not event.content or not event.content.parts:
                continue
            for part in event.content.parts:
                if part.text:
                    full_text += part.text
    except asyncio.TimeoutError:
        pass
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    return {"response": full_text or "(empty)", "events": len(events)}


# ── Main entry ──────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "geap_agent.server:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080)),
        reload=False,
    )
