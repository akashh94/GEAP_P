# GEAP E*TRADE POC

Internal proof-of-concept for testing the Gemini Enterprise Agent Platform (GEAP) against an E*TRADE-like financial workspace.

A framework-free mock of the E*TRADE customer portal with integrated GEAP-powered AI agent features: multi-agent chat, Agent Studio, Agent Fabric, and real-time monitoring.

## Features

- **E*TRADE Mock UI** — Pixel-accurate E*TRADE-like dashboard with market strip, purple nav bar, account cards, portfolio views, watch lists, and disclosures.
- **AI Chat Assistant** — Floating chat panel with 4 specialized agents (Portfolio Analyst, Trade Assistant, Market Research, Customer Support), auto-routing, and Gemini 2.0 Flash integration.
- **Agent Studio** — Visual agent builder with flow diagram, system prompt editor, model config, tool declarations, and live test console.
- **Agent Fabric** — Fleet monitoring dashboard with metrics, agent cards, live activity log, routing map, and governance toggles.
- **Mock Data** — Synthetic brokerage data (accounts, holdings, market indices, transactions, watchlists) for all agent interactions.

## Run Locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

### Key Routes

```text
http://localhost:3000/accounts          # Dashboard (Complete View)
http://localhost:3000/accounts/portfolios  # Portfolio allocation & holdings
http://localhost:3000/trading           # Trading placeholder
http://localhost:3000/agent-studio      # GEAP Agent Studio
http://localhost:3000/agent-fabric      # GEAP Agent Fabric
```

### Enabling AI Chat

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Click the **Chat** button (bottom-right)
3. Click **🔑 Set API Key** in the welcome message
4. Enter your key — the chat will connect to Gemini 2.0 Flash

## Project Structure

```text
GEAP/
├── public/
│   ├── css/
│   │   └── styles.css        # All styles (E*TRADE base + GEAP agent components)
│   ├── js/
│   │   ├── app.js            # SPA router, views, GeapApp compatibility layer
│   │   ├── data.js            # BrokerageData — mock data repository
│   │   ├── charts.js          # Canvas chart rendering (line, donut, sparkline)
│   │   ├── agents.js          # AgentManager — 4 agent definitions, routing, tools
│   │   ├── gemini.js          # GeminiAPI — Gemini 2.0 Flash streaming + function calling
│   │   ├── chat.js            # Chat panel UI & message handling
│   │   ├── agent-studio.js    # Agent Studio SPA view
│   │   └── agent-fabric.js    # Agent Fabric SPA view
│   └── index.html             # Single HTML entry point (SPA shell)
├── docs/
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
├── evaluations/
│   ├── datasets/
│   ├── reports/
│   └── scenarios/
├── scripts/
├── security/
│   ├── audit/
│   └── policies/
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── unit/
├── server.js                  # Express static + SPA route fallbacks
├── package.json
└── README.md
```

## POC Boundaries

- All account, market, alert, and portfolio values are mock data.
- This is not connected to E*TRADE, Morgan Stanley, customer accounts, trading systems, or market data.
- Branding is represented as an internal POC mock so the prototype feels familiar without being production software.
- No frontend frameworks are used.
- Express is used only to serve static files and route fallbacks.

## Useful Docs

- [System Documentation](docs/SYSTEM_DOCUMENTATION.md)
- [Project roadmap](docs/ROADMAP.md)
- [Architecture notes](docs/ARCHITECTURE.md)

© 2026 Internal GEAP POC. All data is synthetic.
