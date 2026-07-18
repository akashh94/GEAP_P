# Integration Plan: Frontend SPA + ADK Agents on FastAPI

## Goal

Replace the current setup (Express server + browser-side Gemini API calls + client-side mock data) with a single FastAPI server that runs the ADK agent tree and streams responses to the frontend via SSE.

## Architecture

```
Browser (SPA)
  │
  ├── POST /api/chat  (SSE stream)
  │     → FastAPI → ADK Runner.run_async() → stream events back
  │
  ├── GET /api/search?q=...
  │     → Google News RSS proxy (moved from Express)
  │
  ├── GET /api/etrade/*  (moved from Express)
  │     → E*TRADE OAuth proxy (same logic, Python httpx)
  │
  └── GET / → static files (current public/)
```

Single port. No CORS. No two-server dance.

## Current State

| Layer | What it does | File(s) |
|-------|-------------|---------|
| Frontend static files | SPA shell, CSS, JS | public/ |
| Chat API (browser-side) | Calls Gemini API via @google/genai SDK | public/js/gemini.js |
| Agent manager (browser-side) | 6 agent defs, keyword auto-routing, tool implementations | public/js/agents.js |
| Chat UI | Message rendering, ~3000 lines mock responses, PII, safety, compliance | public/js/chat.js |
| Express server | Static file serving, E*TRADE OAuth proxy, search proxy | server.js |
| ADK agent tree | Supervisor + 6 sub-agents with Python tools + mock brokerage data | geap_agent/ |

## Step 1: Create server.py

FastAPI server at project root. Single file.

### Static files

Mount `public/` as static files directory.

### ADK setup

Create `Runner` with `root_agent` from `geap_agent/agents/supervisor.py` + `InMemorySessionService`.

### Chat SSE endpoint

`POST /api/chat` accepts `{ "message": "...", "session_id": "..." }`, returns `text/event-stream`.

ADK `Runner.run_async()` yields Event objects. Convert:

| ADK Event | SSE frame |
|-----------|-----------|
| `event.content.parts[].text` + `event.partial` | `{ type: "text", content: "...", partial: true/false }` |
| `event.content.parts[].function_call` | `{ type: "tool_call", name: "...", args: {...} }` |
| `event.content.parts[].function_response` | `{ type: "tool_result", name: "..." }` |
| `event.is_final_response()` → true | `{ type: "done" }` |

Session ID: browser generates UUID via `crypto.randomUUID()`, stores in `localStorage`, sends with each request.

### Search proxy

`GET /api/search?q=...&domains=...` — same Google News RSS logic as server.js, ported to httpx.

### E*TRADE proxy

`GET /auth/etrade`, `/auth/etrade/callback`, `/api/etrade/*` — same OAuth 1.0a flow and REST proxy logic as server.js, ported to Python with httpx + oauthlib.

Token storage: in-memory dict `{session_id: {access_token, request_token, ...}}` instead of `req.session`.

## Step 2: Create public/js/adk.js

SSE client with the same interface as the current `GeminiAPI`. Uses `fetch()` + `ReadableStream.getReader()` to parse SSE frames. Browser generates session UUID via `crypto.randomUUID()`.

## Step 3: Modify public/js/chat.js

| Change | What to do |
|--------|-----------|
| Import swap | Replace `GeminiAPI.sendMessage()` call with `AdkApi.sendMessage()` async generator |
| Remove auto-route | Delete the `AgentManager.autoRoute()` call — ADK supervisor handles routing |
| Remove tool calls | Delete the `AgentManager.callTool()` call — tools run server-side |
| Remove mock blocks | Delete ~3000 lines of `if (normalizedMsg.includes(...))` mock response fallbacks |
| Keep | UI bubble rendering, PII scrubbing, safety filter, compliance disclaimers, audit logging |

The new send flow:

```javascript
// Before:
const response = await GeminiAPI.sendMessage(history, systemPrompt, tools);

// After:
let fullText = '';
for await (const event of AdkApi.sendMessage(userMessage)) {
  if (event.type === 'text') {
    fullText += event.content;
    if (event.partial) updateStreamingBubble(event.content);
  } else if (event.type === 'done') {
    finalizeResponse(fullText);
  }
}
```

## Step 4: Modify public/js/agents.js

Strip `toolImplementations` — no client-side tool code needed. If the agent chip selector in the chat UI stays, keep agent names/descriptions for display only. If it goes, remove the file entirely.

## Step 5: Update public/index.html

Swap script tag: `<script src="/js/gemini.js">` → `<script src="/js/adk.js">`

## Step 6: Decommission

- `server.js` — all routes ported to `server.py`, file becomes dead code
- `public/js/gemini.js` — replaced by `public/js/adk.js`
- `requirements.txt` — add `fastapi`, `uvicorn`, `httpx`, `oauthlib`

## Files summary

| File | Action |
|------|--------|
| `server.py` | Create |
| `public/js/adk.js` | Create |
| `public/js/chat.js` | Modify |
| `public/js/agents.js` | Modify |
| `public/index.html` | Modify |
| `requirements.txt` | Modify |
| `server.js` | Decommission |
| `public/js/gemini.js` | Decommission |

## Open questions

1. **Agent selector UI** — chat has a dropdown for "Auto / Portfolio Analyst / Trade Assistant / ...". With server-side ADK routing, "Auto" is the only mode. Keep or remove?
2. **Tool call visibility** — show "Calling get_quote..." in chat, or just stream the response silently?
3. **Mock response fallback** — after removing the ~3000 lines of mock blocks, what happens if the server is unreachable?

## Verification

1. `uvicorn server:app --reload`
2. Open `http://localhost:8000`
3. "What's my portfolio balance?" → portfolio analyst → mock data displayed
4. "Get me a quote for AAPL" → trade assistant → mock quote
5. Verify text streams incrementally (SSE working)
6. Verify `/api/search` returns RSS results
7. Verify E*TRADE proxy endpoints work (if connected)
