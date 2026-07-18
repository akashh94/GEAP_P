import sys

#!/usr/bin/env python3
"""Root server — serves the GEAP Agent UI and the ADK agent API on one port.

Usage:
    python server.py

Requires a Firestore database in the target GCP project:
    gcloud firestore databases create --location=us-west1

Authentication:
    Local:  gcloud auth application-default login
    Cloud Run:  default service account (auto)
"""

from pathlib import Path

from geap_agent.server import app
from fastapi.responses import FileResponse

UI_DIR = Path(__file__).parent / "agent_ui"


@app.get("/{path:path}")
async def serve_frontend(path: str):
    """SPA catch-all — serves static files or falls back to index.html."""
    file_path = UI_DIR / path
    if path and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(UI_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn

    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(__import__('os').environ.get("PORT", 8080))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
