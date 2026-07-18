"""Deploy the GEAP agent to Vertex AI Agent Engine.

Idempotent: looks up an existing engine by display name and updates it,
otherwise creates a new one. This lets CI run the same command every time
without tracking resource IDs.

Usage (from the repo root):
    python -m deployment.deploy deploy    # create or update
    python -m deployment.deploy list      # list deployed engines
    python -m deployment.deploy delete    # delete the engine (by display name)

Configuration is taken from the environment (a local .env is loaded if
present — see .env.example):
    GOOGLE_CLOUD_PROJECT    (required)
    STAGING_BUCKET          (required, gs://bucket-name)
    GOOGLE_CLOUD_LOCATION   (default: us-west1)
    AGENT_DISPLAY_NAME      (default: GEAP Orchestrator)
"""
import os
import sys

import dotenv
import vertexai
from vertexai import agent_engines
from vertexai.preview.reasoning_engines import AdkApp

dotenv.load_dotenv()

from geap_agent.agent import root_agent  # noqa: E402

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-west1")
STAGING_BUCKET = os.environ.get("STAGING_BUCKET")
DISPLAY_NAME = os.environ.get("AGENT_DISPLAY_NAME", "GEAP Orchestrator")

# Runtime dependencies installed inside the Agent Engine container. Keep in
# sync with deployment/requirements.txt — the agent must run against the
# same versions it was validated with.
AGENT_REQUIREMENTS = [
    "google-adk~=2.4.0",
    "google-cloud-aiplatform[agent_engines,adk]~=1.160.0",
    "google-genai~=2.11.0",
    "python-dotenv~=1.2",
]

# Environment forwarded to the deployed agent.
AGENT_ENV = {
    "GOOGLE_GENAI_USE_VERTEXAI": "true",
    "AGENT_MODEL": os.environ.get("AGENT_MODEL", "gemini-2.5-flash"),
    # Model calls route to the global endpoint to avoid regional
    # dynamic-shared-quota throttling (see geap_agent/config/models.py).
    "MODEL_LOCATION": os.environ.get("MODEL_LOCATION", "global"),
}


def _require_config() -> None:
    missing = [
        name
        for name, value in (
            ("GOOGLE_CLOUD_PROJECT", PROJECT),
            ("STAGING_BUCKET", STAGING_BUCKET),
        )
        if not value
    ]
    if missing:
        sys.exit(f"Missing required environment variables: {', '.join(missing)}")


def _find_existing():
    for engine in agent_engines.list():
        if engine.display_name == DISPLAY_NAME:
            return engine
    return None


def make_app() -> AdkApp:
    return AdkApp(agent=root_agent, enable_tracing=True)


def cmd_deploy() -> None:
    existing = _find_existing()
    if existing:
        print(f"Updating existing engine: {existing.resource_name}")
        engine = agent_engines.update(
            resource_name=existing.resource_name,
            agent_engine=make_app(),  # type: ignore[arg-type]  # SDK stubs don't expose AdkApp yet
            requirements=AGENT_REQUIREMENTS,
            extra_packages=["geap_agent"],
            env_vars=AGENT_ENV,  # type: ignore[arg-type]  # dict[str,str] is invariant to Dict[str,str|SecretRef]
        )
        print(f"Updated: {engine.resource_name}")
    else:
        print(f"No engine named {DISPLAY_NAME!r} found; creating.")
        engine = agent_engines.create(
            make_app(),  # type: ignore[arg-type]  # SDK stubs don't expose AdkApp yet
            display_name=DISPLAY_NAME,
            description="GEAP multi-agent orchestrator (ADK Python)",
            requirements=AGENT_REQUIREMENTS,
            extra_packages=["geap_agent"],
            env_vars=AGENT_ENV,  # type: ignore[arg-type]  # dict[str,str] is invariant to Dict[str,str|SecretRef]
        )
        print(f"Created: {engine.resource_name}")


def cmd_list() -> None:
    for engine in agent_engines.list():
        print(f"{engine.resource_name}\t{engine.display_name}")


def cmd_delete() -> None:
    existing = _find_existing()
    if not existing:
        sys.exit(f"No engine named {DISPLAY_NAME!r} found.")
    existing.delete(force=True)
    print(f"Deleted: {existing.resource_name}")


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ("deploy", "list", "delete"):
        sys.exit(__doc__)
    _require_config()
    vertexai.init(project=PROJECT, location=LOCATION, staging_bucket=STAGING_BUCKET)
    {"deploy": cmd_deploy, "list": cmd_list, "delete": cmd_delete}[sys.argv[1]]()


if __name__ == "__main__":
    main()
