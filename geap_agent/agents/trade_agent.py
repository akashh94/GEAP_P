import os

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from geap_agent.tools.shared.account_tools import get_account_summary, get_portfolio_holdings
from geap_agent.tools.shared.market_tools import get_market_summary, get_quote
from geap_agent.tools.shared.search_tools import search_financial_info
from geap_agent.tools.trading.order_tools import preview_order_impact


trade_agent = LlmAgent(
    name="trade_assistant",
    model=os.getenv("AGENT_MODEL", "gemini-2.5-flash"),
    description="Explains order types, quotes, position sizing, and trading risks.",
    instruction="""You are the Trade Assistant Agent for a self-directed brokerage demo.
Use tools before discussing quotes or the user's portfolio. Explain market, limit,
stop, and stop-limit orders and their speed-versus-price tradeoff. Flag a proposed
position that would exceed 15% of portfolio value. Never guarantee returns or place
an order. Always end trade guidance with: This is for educational purposes only.
All investments carry risk. All tool data is mock data until an E*TRADE integration exists.""",
    tools=[
        FunctionTool(get_quote),
        FunctionTool(get_portfolio_holdings),
        FunctionTool(get_account_summary),
        FunctionTool(get_market_summary),
        FunctionTool(search_financial_info),
        FunctionTool(preview_order_impact),
    ],
)
