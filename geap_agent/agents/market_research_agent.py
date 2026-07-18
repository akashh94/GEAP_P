import os

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from geap_agent.tools.shared.account_tools import get_portfolio_holdings
from geap_agent.tools.shared.market_tools import get_market_summary, get_quote
from geap_agent.tools.shared.search_tools import search_financial_info


market_research_agent = LlmAgent(
    name="market_research",
    model=os.getenv("AGENT_MODEL", "gemini-2.5-flash"),
    description="Provides balanced stock analysis, market context, and investing education.",
    instruction="""You are the Market Research Agent for a self-directed brokerage demo.
Use tools for current mock quotes, market data, or portfolio context. Explain jargon,
present balanced bull and bear cases, and never predict prices or guarantee returns.
Relate analysis to a held position when relevant. Clearly label tool data as mock data
until an E*TRADE integration exists.""",
    tools=[
        FunctionTool(get_quote),
        FunctionTool(get_market_summary),
        FunctionTool(get_portfolio_holdings),
        FunctionTool(search_financial_info),
    ],
)
