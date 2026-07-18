# GEAP E*TRADE POC Roadmap

## Phase 0: Foundation And Mock Surface

Status: scaffolded

- Build a no-framework E*TRADE-like account workspace.
- Serve the app through a simple Express server.
- Support deep links and browser refresh.
- Make primary and secondary navigation functional.
- Use fully synthetic account, market, alert, and portfolio data.
- Add responsive behavior for desktop, tablet, and mobile.
- Add an assistant panel placeholder for future GEAP features.

Acceptance criteria:

- `npm start` serves the app locally.
- `/accounts` and `/accounts/portfolios` render useful POC pages.
- The app is usable on desktop and mobile widths.
- The app has no frontend framework dependency.

## Phase 1: GEAP Discovery And Adapter Design

Status: next

- Inventory available GEAP local tooling, SDKs, authentication flows, model endpoints, and agent runtime constraints.
- Identify what can run fully local versus what requires enterprise network access.
- Define an adapter boundary between the mock UI and GEAP services.
- Decide how user identity, account context, permissions, and request metadata will be represented.
- Create a local configuration strategy for non-secret settings and environment-specific secrets.

Deliverables:

- GEAP integration notes.
- Adapter interface design.
- Environment setup checklist.
- First smoke test from local code to GEAP.

## Phase 2: Agent Shell

Status: planned

- Replace the placeholder chat panel with a GEAP-backed assistant.
- Add streaming responses if supported.
- Send route, visible account, selected tab, and user intent context to the agent.
- Add suggested prompt chips for common investor-service scenarios.
- Keep the response UI lightweight and accessible.

Candidate prompts:

- "Explain why my portfolio is up today."
- "Summarize my alerts."
- "Show me accounts with negative day gain."
- "Help me compare CORE and MAIN."
- "What should I review before placing a trade?"

Acceptance criteria:

- Assistant responds using the current mock page context.
- Assistant never claims access to real accounts or real market data.
- Assistant responses include a clear distinction between mock data and production behavior.

## Phase 3: Tool-Backed Navigation And Read Actions

Status: planned

- Add read-only tools for mock accounts, positions, alerts, watchlists, and disclosures.
- Allow the agent to navigate the mock app by route.
- Allow the agent to open account sections, switch portfolio tabs, and select accounts.
- Add trace logging for each tool call.
- Add a visible activity log for demo review.

Acceptance criteria:

- Agent can answer questions by calling mock read tools.
- Agent can change the visible route or selected account on request.
- Tool calls are logged with timestamp, input, output summary, and decision rationale.

## Phase 4: Guardrails, Entitlements, And Audit

Status: planned

- Add role and entitlement simulation.
- Block high-risk actions such as real trading, withdrawals, credential changes, and account opening.
- Require explicit user confirmation for simulated trade-ticket or money-movement preparation.
- Add audit metadata for prompt, context, tool calls, and final response.
- Add compliance copy for educational and non-advisory boundaries.

Acceptance criteria:

- Agent cannot execute restricted actions.
- Agent asks for confirmation before simulated action preparation.
- All tool calls are auditable.

## Phase 5: High-Value Demo Use Cases

Status: planned

Build three to five demo flows that show GEAP value without production risk:

- Account briefing: summarize all visible accounts, day gain, alerts, and items needing attention.
- Portfolio explanation: explain allocation, movers, concentration, and account performance.
- Alert triage: group alerts by urgency and recommend next review step.
- Navigation assistant: take the user to the correct area for a task.
- Document helper: explain what a mock tax form or disclosure means.

Acceptance criteria:

- Each flow has a scripted demo path.
- Each flow has expected tool calls and expected response qualities.
- Each flow has clear risk controls.

## Phase 6: Evaluation And Test Harness

Status: planned

- Add deterministic test data fixtures.
- Add prompt regression tests.
- Add tool-call contract tests.
- Add browser tests for key user journeys.
- Add response evaluation criteria for correctness, safety, and usefulness.

Acceptance criteria:

- CI or local scripts can run smoke tests.
- Regressions in navigation, mock data access, and guardrail behavior are caught early.

## Phase 7: Production Readiness Assessment

Status: planned

- Map prototype behavior to Morgan Stanley and E*TRADE security, compliance, privacy, and model-risk requirements.
- Identify integrations needed for identity, entitlements, logging, monitoring, and incident response.
- Define data classification and retention requirements.
- Produce a go/no-go assessment for expanding beyond mock data.

Deliverables:

- Risk register.
- Production integration checklist.
- Security and compliance review packet.
- Recommended next pilot scope.
