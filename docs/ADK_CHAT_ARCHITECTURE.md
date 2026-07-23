# GEAP Chat Architecture — ADK Backend Integration

This document explains the chat system architecture after routing all queries through the ADK backend at `POST /api/chat`, removing the client-side Gemini API and hardcoded mock responses.

---

## Why This Change

Before this change, the chat panel had two modes that bypassed the ADK backend:

1. **Hardcoded mock responses** (~3000 lines in `chat.js`) — keyword-matched static text triggered by phrases like "rebalance", "retirement", "AAPL"
2. **Direct browser-to-Gemini API** (`gemini.js`) — called Google's Gemini API directly from the browser using a user-provided API key stored in `localStorage`

The ADK backend at `POST /api/chat` already had all the capabilities needed:

- 6 specialized LLM agents with proper system prompts (portfolio analyst, trade assistant, market research, super agent, customer support, mortgage agent)
- `StaticBrokerageService` — the same mock portfolio data (12 holdings, quotes, sector allocation) that the frontend was hardcoding
- Tool execution (get_quote, get_portfolio_holdings, get_account_summary, etc.)
- SSE streaming for real-time responses

The old architecture duplicated the mock data and agent logic in two places (frontend and backend) and required users to provide a Gemini API key in the browser just to use the chat.

---

## Architecture Flow

```mermaid
graph TD
    User([User types a message]) --> Send[Chat.sendMessage]
    
    Send --> Preprocess[Preprocess Query]
    Preprocess --> PII[PII Redaction]
    Preprocess --> Safety[Safety Filter]
    Safety -->|Blocked| BlockedMsg[Show safety alert]
    Safety -->|Passed| AdkCall
    
    PII --> AdkCall
    
    AdkCall --> AdkApi[AdkApi.sendMessage]
    
    subgraph AdkApi [client-side: agent_ui/js/adk.js]
        AdkApi --> Fetch[POST /api/chat]
        Fetch --> Headers[Headers: X-User-ID, X-Session-ID]
        Fetch --> Body["Body: {&quot;message&quot;: &quot;...&quot;}"]
        Body --> SSERead[Read SSE stream]
        SSERead --> Chunk[&quot;text&quot; event → onChunk]
        SSERead --> Done[&quot;done&quot; event → onDone]
        SSERead --> Error[&quot;error&quot; event → onError]
    end
    
    Chunk --> StreamUI[updateStreamingBubble]
    Done --> Finalize[addMessageToUI · push to history · audit]
    Error --> ShowError[Show error in chat]
    
    Fetch --> Server[Python FastAPI Server]
    
    subgraph Server [server-side: geap_agent/server.py]
        Server --> Runner[ADK Runner]
        Runner --> Agents[Agent Tree]
    end
    
    subgraph Agents [geap_agent/agents/]
        Agents --> Supervisor[supervisor · orchestrator]
        Supervisor --> PA[portfolio_analyst]
        Supervisor --> TA[trade_assistant]
        Supervisor --> MR[market_research]
        Supervisor --> MRS[market_research_super_agent]
        Supervisor --> CS[customer_support]
        Supervisor --> MA[mortgage_agent]
    end
    
    Runner --> Tools[Tool Execution]
    
    subgraph Tools [geap_agent/tools/]
        Tools --> Q[get_quote]
        Tools --> H[get_portfolio_holdings]
        Tools --> S[get_sector_allocation]
        Tools --> M[get_market_summary]
        Tools --> F[get_faq]
        Tools --> Search[search_financial_info]
    end
    
    Tools --> StaticData[StaticBrokerageService]
    
    subgraph StaticData [geap_agent/services/static_brokerage_service.py]
        StaticData --> Holdings[12 holdings: AAPL, MSFT, NVDA...]
        StaticData --> Quotes[Mock quotes · derived prices]
        StaticData --> Sectors[Sector allocation]
        StaticData --> Indices[Market indices]
        StaticData --> FAQ[5 FAQ entries]
    end

    style AdkApi fill:#e1f5fe,stroke:#0288d1
    style StaticData fill:#f3e5f5,stroke:#7b1fa2
```

---

## Request/Response Flow

### Step-by-step

```
1. User types "What stocks do I own?" in chat input

2. Chat.sendMessage() in chat.js:
   a. preprocessQuery() — PII redaction, safety filter
   b. If blocked → return safety alert
   c. If passed → continue

3. AdkApi.sendMessage(message, onChunk, onDone, onError) in adk.js:
   a. Generate session/user IDs if not exist
      - localStorage['adk_session_id'] = crypto.randomUUID()
      - localStorage['adk_user_id'] = 'user-' + crypto.randomUUID().slice(0,8)
   b. POST /api/chat with headers:
      X-User-ID: <user_id>
      X-Session-ID: <session_id>
      Content-Type: application/json
   c. Body: {"message": "What stocks do I own?"}

4. FastAPI server (geap_agent/server.py) receives request:
   a. Validates headers and body
   b. Creates types.Content(role="user", parts=[{text: "..."}])
   c. Calls runner.run_async() with the ADK agent tree

5. ADK Runner:
   a. supervisor agent receives the query
   b. supervisor delegates to portfolio_analyst (best match)
   c. portfolio_analyst calls get_portfolio_holdings() tool
   d. Tool returns data from StaticBrokerageService
   e. LLM generates response using tool data

6. Server collects all ADK events (non-streaming mode), then replays as SSE:
   event: message
   data: {"type": "text", "content": "Based on your portfolio you hold the following positions..."}

   event: message
   data: {"type": "done"}

7. adk.js receives each event:
   - "text" → calls onChunk(content) → updates streaming bubble in UI
   - "done" → calls onDone(fullText) → finalizes the message

8. Chat finalizes:
   - Removes typing indicator
   - Calls addMessageToUI('assistant', responseText, ...)
   - Calls postprocessResponse() for disclaimers
   - Pushes to conversationHistory
   - Logs audit
   - Sets isStreaming = false
```

### SSE Event Format

Every server event follows this structure:

```
event: message
data: {"type": "<event_type>", ...}
```

| Event Type | Fields | Description |
|-----------|--------|-------------|
| `text` | `content: string` | Complete text response from the LLM (not token-level streaming) |
| `tool_call` | `name: string, args: object` | ADK requested a tool execution |
| `tool_result` | `name: string, content: object` | Tool execution completed |
| `done` | *(none)* | Stream completed normally |
| `error` | `content: string` | Internal streaming error |

**Note:** The SSE endpoint does not stream individual tokens. The ADK's `StreamingMode.SSE` mode changes event format in ways that don't work with `EventSourceResponse`. Instead, the server collects all events from the default (non-streaming) runner and replays them as SSE frames. Each `"text"` event contains the complete accumulated text from a single ADK event — not individual tokens. For most queries this means a single `"text"` event followed by `"done"`.

---

## Changed Files

| File | Change |
|------|--------|
| `agent_ui/js/adk.js` | **New** — SSE streaming client |
| `agent_ui/js/chat.js` | **Modified** — mock/Gemini logic replaced with AdkApi call |
| `agent_ui/index.html` | **Modified** — gemini.js → adk.js in script tag |
| `agent_ui/js/gemini.js` | **Deleted** |

## Unchanged Files

| File | Reason |
|------|--------|
| `geap_agent/server.py` | ADK SSE endpoint works as-is |
| `geap_agent/agents/` | All 6 sub-agents unchanged |
| `geap_agent/services/static_brokerage_service.py` | Mock data unchanged |
| `server.py` | Route stubs unchanged |
| `agent_ui/css/` | All styles unchanged |
| `agent_ui/js/app.js` | SPA router unchanged |

---

## Key Design Decisions

### Why remove gemini.js entirely?

The ADK backend handles everything gemini.js did — LLM calls, tool execution, agent routing — plus multi-agent orchestration, session persistence, and Firestore memory. Keeping gemini.js would maintain a dead code path.

### Why remove hardcoded mock responses?

StaticBrokerageService contains the same mock data. The ADK agents generate dynamic, context-aware responses from it instead of static text. No duplicated logic.

### Session management

In `adk.js`:
- **user_id**: `'user-' + crypto.randomUUID().slice(0, 8)` in localStorage
- **session_id**: `crypto.randomUUID()` in localStorage

Generated once, persisted across page reloads.

### Data flow comparison

| | Before | After |
|--|--------|-------|
| LLM call | Browser → Google Gemini API | Browser → ADK Server → Gemini/Vertex |
| API key | User enters in browser | Server uses Vertex AI service account |
| Mock data | Duplicated in frontend JS | Single source: StaticBrokerageService |
| Agent routing | Client-side keyword scoring | Server-side ADK supervisor |
| Tool execution | JavaScript in browser | Python on server |

---

## Running the System

```bash
cd D:\vscode_projects\GEAP
.venv\Scripts\python server.py
```

Open `http://localhost:8080`. The ADK agent API runs at `POST /api/chat` on the same port.

### Environment variables (`geap_agent/.env`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `GOOGLE_GENAI_USE_VERTEXAI` | `TRUE` | Use Vertex AI instead of direct Gemini API |
| `GOOGLE_CLOUD_PROJECT` | `adk-tut-499512` | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | `us-west1` | GCP region |
| `AGENT_MODEL` | `gemini-2.5-flash` | LLM model for all agents |
| `GOOGLE_CLOUD_STAGING_BUCKET` | `gs://geap-agent` | GCS bucket for Vertex AI |
