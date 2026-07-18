"""Single-file entry point for ADK web UI discovery.

``adk web`` uses ``is_single_agent_directory()`` to detect this file, then
``import geap_agent.agent`` and look for ``root_agent``.
"""

from geap_agent.agents.supervisor import root_agent

__all__ = ["root_agent"]
