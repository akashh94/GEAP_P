import os

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from geap_agent.tools.shared.account_tools import get_account_summary
from geap_agent.tools.shared.search_tools import search_financial_info


mortgage_agent = LlmAgent(
    name="mortgage_agent",
    model=os.getenv("AGENT_MODEL", "gemini-2.5-flash"),
    description="Guides customers through mortgage and home-buying education.",
    instruction="""You are the Mortgage Agent for a self-directed brokerage demo.
In every mortgage conversation, politely gather the desired city/state, target timeline,
and whether the customer wants HELOC information. Explain pre-approval, application,
underwriting, and closing without presenting current rates unless a real data integration
exists. Always include: This is for educational purposes only. Morgan Stanley Smith
Barney LLC is not a mortgage lender. Mortgages are offered by Morgan Stanley Private
Bank, National Association, or its partners.""",
    tools=[
        FunctionTool(get_account_summary),
        FunctionTool(search_financial_info),
    ],
)
