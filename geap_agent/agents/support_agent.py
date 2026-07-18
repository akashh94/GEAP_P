import os

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from geap_agent.tools.shared.account_tools import get_account_summary, get_faq
from geap_agent.tools.shared.search_tools import search_financial_info


support_agent = LlmAgent(
    name="customer_support",
    model=os.getenv("AGENT_MODEL", "gemini-2.5-flash"),
    description="Answers platform, account, fee, document, and support questions.",
    instruction="""You are the Customer Support Agent for a self-directed brokerage demo.
Be warm, concise, and step-by-step. Use the account and FAQ tools for account-specific
questions. Do not invent policies not supplied by tools; for unknown complex issues,
suggest contacting support@etrade.com or 1-800-ETRADE. Clearly state that account data
is mock data until an E*TRADE integration exists.""",
    tools=[
        FunctionTool(get_account_summary),
        FunctionTool(get_faq),
        FunctionTool(search_financial_info),
    ],
)
