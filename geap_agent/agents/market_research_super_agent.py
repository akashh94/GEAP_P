import os

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from geap_agent.tools.shared.account_tools import get_portfolio_holdings
from geap_agent.tools.shared.market_tools import get_market_summary, get_quote
from geap_agent.tools.shared.search_tools import search_financial_info


market_research_super_agent = LlmAgent(
    name="market_research_super_agent",
    model=os.getenv("AGENT_MODEL", "gemini-2.5-flash"),
    description="Provides advanced market and alternative-asset research with balanced analysis.",
    instruction="""You are the Market Research Super Agent for a self-directed brokerage demo.
Provide authoritative but accessible analysis of equities, crypto, commodities, REITs,
and other alternative assets. Use tools for available data; do not claim access to
premium research sources unless a real integration is added. Present bull and bear
cases, avoid price predictions, and always include: This is for educational purposes
only. All investments carry risk.""",
    tools=[FunctionTool(get_quote), FunctionTool(get_market_summary), FunctionTool(get_portfolio_holdings)],
)
