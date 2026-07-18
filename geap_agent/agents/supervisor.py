from google.adk.agents import LlmAgent

from geap_agent.agents.portfolio_agent import portfolio_agent
from geap_agent.agents.trade_agent import trade_agent
from geap_agent.agents.market_research_agent import market_research_agent
from geap_agent.agents.market_research_super_agent import market_research_super_agent
from geap_agent.agents.support_agent import support_agent
from geap_agent.agents.mortgage_agent import mortgage_agent
import os


root_agent = LlmAgent(
    name="supervisor",

    model=os.getenv("AGENT_MODEL", "gemini-2.5-flash"),

    instruction="""
        You are the supervisor agent.

        Your responsibility is to understand the user's request
        and delegate it to the most appropriate specialist agent.

        Never answer portfolio analysis questions yourself when a
        specialized agent is available.

        Delegate whenever possible.
        """,

    sub_agents=[
        portfolio_agent,
        trade_agent,
        market_research_agent,
        market_research_super_agent,
        support_agent,
        mortgage_agent,
    ],
)
