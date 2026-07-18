import os

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from geap_agent.prompts.portfolio_prompt import PORTFOLIO_PROMPT

from geap_agent.tools.shared.account_tools import (
    get_account_summary,
    get_portfolio_holdings,
    get_sector_allocation,
)
from geap_agent.tools.shared.search_tools import search_financial_info


portfolio_agent = LlmAgent(
    name="portfolio_analyst",
    model=os.getenv("AGENT_MODEL", "gemini-2.5-flash"),
    description=(
        "Analyzes portfolio allocation, diversification, "
        "holdings, performance and sector exposure."
    ),
    instruction=PORTFOLIO_PROMPT,

    tools=[
        FunctionTool(get_portfolio_holdings),
        FunctionTool(get_account_summary),
        FunctionTool(get_sector_allocation),
        FunctionTool(search_financial_info),
    ],
)
