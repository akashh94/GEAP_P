# ADK Web UI — Architecture & Flow

## Starting the UI

```bash
adk web geap_agent
```

The argument `geap_agent` is an **agents directory** containing `agent.py`, making it a valid single-agent directory that the ADK agent loader discovers automatically.

## Discovery (what happens at startup)

```
adk web geap_agent
  └─ AgentLoader(is_single_agent=True)
       └─ is_single_agent_directory("./geap_agent")  →  True (has agent.py)
            └─ load_agent("geap_agent")
                 └─ import geap_agent.agent
                      └─ from geap_agent.agents.supervisor import root_agent
                           └─ imports all 6 sub-agents:
                                portfolio_agent
                                trade_agent
                                market_research_agent
                                market_research_super_agent
                                support_agent
                                mortgage_agent
                           └─ returns root_agent (LlmAgent, name="supervisor")
```

The loader finds `root_agent` exported from `agent.py`, attaches origin metadata, and the web UI boots with the supervisor agent as the entry point.

## Request Flow (user sends a message)

```
Browser  ──POST /apps/geap_agent/──→  FastAPI (ApiServer)
                                            │
                                     Runner.run_async(...)
                                            │
                              supervisor (LlmAgent mode="chat")
                                   │                │
                           ┌───────┴───────┐
                           │               │
                     instruction      sub_agents
                     "Delegate to        │
                      the most        portfolio_analyst
                      appropriate     trade_assistant
                      specialist      market_research
                      agent."         market_research_super_agent
                                      customer_support
                                      mortgage_agent
                           │               │
                     ┌─────┴──────┐
                     │            │
               AutoFlow      content generation
               (delegate      (Gemini model)
                via FC)            │
                     │        ┌────┴────┐
                     │        │         │
                     │   replies     tool calls
                     │   directly   (get_quote,
                     │              get_holdings,
                     │              etc.)
                     │
          ┌──────────┴──────────┐
          │                     │
    user asks about        user asks about
    portfolio  ──────→     trade_assistant
                          (delegated via
                           transfer_to_agent)
                               │
                          preview_order_impact
                          get_quote
                          etc.
```

### Key details

1. **Supervisor never answers directly** — instruction says "delegate whenever possible." It classifies intent and calls `transfer_to_agent` with the matching sub-agent name.
2. **Each sub-agent has its own tools** — defined in `geap_agent/tools/`:
   - `shared/` — account, market, search tools (multiple agents use these)
   - `portfolio/` — concentration analysis (portfolio analyst only)
   - `trading/` — order preview (trade assistant only)
3. **All tools use `BrokerageService`** — injected through `geap_agent/config/container.py`. Currently `StaticBrokerageService` (in-memory mock data). Swapping to real E*TRADE means implementing the same abstract interface.
4. **Session persistence** — web UI uses a SQLite DB in `geap_agent/.adk/session.db` (local storage mode, default).

## Data flow per tool call

```
User: "What's my portfolio balance?"

supervisor → portfolio_analyst
                 │
           get_account_summary()
                 │
           brokerage_service.get_portfolio_summary().to_dict()
                 │
           {"total_value": 238846.12, "cash_balance": 14869.92, ...}
                 │
           portfolio_analyst formats reply in natural language
```

## Directory layout (what matters for `adk web`)

```
geap_agent/
  agent.py           ← entry point: exports root_agent
  __init__.py        ← re-exports from agent.py
  .env               ← Vertex AI / API key config
  agents/            ← sub-agent definitions
    supervisor.py    ← root_agent = LlmAgent with 6 sub_agents
    portfolio_agent.py
    trade_agent.py
    market_research_agent.py
    market_research_super_agent.py
    support_agent.py
    mortgage_agent.py
  tools/             ← function tools
  models/            ← Pydantic domain models
  services/          ← BrokerageService interface + mock
  config/            ← DI container (single import)
  prompts/           ← dedicated prompt files
  main.py            ← optional CLI REPL (not used by web UI)
```

## Running

```bash
# Web UI (recommended for testing)
adk web geap_agent

# Optional flags
adk web geap_agent --port 8000 --logo-text "GEAP"
```

This starts a FastAPI server at `http://127.0.0.1:8000`. Open the URL in a browser to see the ADK Playground — an interactive chat UI. Select `geap_agent` from the app dropdown (if multiple agents are available) and start chatting.

```bash
# CLI REPL (alternative, no browser needed)
python -m geap_agent.main
```

## Testing the agents

Open the web UI and paste these prompts to exercise each sub-agent.

### Portfolio Analyst

| Prompt | What it tests |
|--------|--------------|
| `What's my current portfolio balance?` | Delegation + `get_account_summary` |
| `Show me my holdings.` | `get_portfolio_holdings` |
| `How are my sectors allocated?` | `get_sector_allocation` |
| `Are any of my positions over-concentrated?` | Category routing to portfolio analyst + concentration check (currently no tool assigned — it will use holdings/search) |
| `What's my biggest position?` | Data retrieval from holdings |

### Trade Assistant

| Prompt | What it tests |
|--------|--------------|
| `Get me a quote for AAPL.` | `get_quote` |
| `What's MSFT trading at?` | `get_quote` |
| `If I buy 20 shares of NVDA, how does that affect my portfolio?` | `preview_order_impact` |
| `Show me the market summary.` | `get_market_summary` |
| `Explain the difference between a market order and a limit order.` | Instruction-based reply (no tool call) |

### Market Research

| Prompt | What it tests |
|--------|--------------|
| `Analyze AAPL for me.` | `get_quote` + balanced analysis |
| `How is the tech sector doing?` | `get_market_summary` + contextual reply |
| `What's the PE ratio of MSFT?` | `get_quote` |
| `Explain dollar-cost averaging.` | Educational reply (no tool call) |

### Market Research Super Agent

| Prompt | What it tests |
|--------|--------------|
| `What's the current price of Bitcoin?` | `get_quote` (BTC ticker) |
| `How is gold performing as an asset class?` | `get_quote` (GLD) + alternative-asset analysis |
| `Compare crypto vs REITs for diversification.` | Educational reply with mock data context |

### Customer Support

| Prompt | What it tests |
|--------|--------------|
| `How do I transfer funds into my account?` | `get_faq` |
| `What are the trading fees?` | `get_faq` |
| `Where can I find my tax documents?` | `get_faq` |
| `What's my account balance?` | `get_account_summary` |

### Mortgage Agent

| Prompt | What it tests |
|--------|--------------|
| `I'm looking to buy a home in Austin, TX within 6 months. Walk me through the process.` | Full mortgage education flow |
| `What's a HELOC and how does it work?` | Educational + disclaimer |
| `How does pre-approval work?` | Step-by-step mortgage guidance |

### Edge cases

| Prompt | What it tests |
|--------|--------------|
| `What does GEAP stand for?` | Falls through to model knowledge (no matching specialist) |
| `Buy 100 shares of TSLA right now.` | Trade assistant should refuse and explain it's educational only |
| `Predict where the market will go next month.` | Any agent should refuse to predict prices |
| `Who are you?` | Supervisor describes its role as a delegation router |
