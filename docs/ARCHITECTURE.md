# Architecture Notes

## Goal

Create a lightweight E*TRADE-like mock application that can be used as the front-end target for GEAP agent experiments.

## Runtime

- `server.js` runs a simple Express server.
- `public/index.html` is the only HTML entry point.
- `public/css/styles.css` contains all styling.
- `public/js/app.js` contains mock data, routing, rendering, and interaction logic.

## Client Architecture

The client is intentionally small and framework-free:

- A static shell renders the market bar, header, primary navigation, secondary navigation, and app container.
- A vanilla JavaScript router maps browser paths to view renderers.
- Mock account, portfolio, alert, launch-pad, and market data live in a single object for easy replacement.
- Navigation links use normal URLs and are intercepted by JavaScript for fast in-page transitions.
- Express returns `index.html` for known app routes so browser refresh and deep links work.

## Current Views

- `Complete View`: account dashboard, account summary cards, portfolio movers, bank account card, watchlist snapshot, side rail, alerts, launch pad, and disclosure footer.
- `Portfolios`: account selector, portfolio summary, allocation tabs, donut chart, holdings tables, and disclosure footer.
- Other navigation destinations: functional placeholder views that preserve the application shell and can be filled in later.

## Future GEAP Integration Points

- `app.js` mock data object can be replaced with calls to GEAP tools or local adapters.
- The floating assistant panel can become the primary GEAP surface.
- Route changes and user actions can emit events for agent observation.
- Buttons such as `Trade`, `Move Money`, `Refresh`, `Documents`, and `Alerts` can become tool-backed intents.
- Guardrail checks should sit between agent recommendations and any simulated execution.

## Performance Choices

- No frontend build step.
- No client framework.
- No external fonts or icon libraries.
- Minimal static assets.
- CSS-driven charting instead of canvas or chart dependencies.
- Express static serving with cache headers.

## Compliance And Safety Notes

- Keep the mock environment visually marked as a POC.
- Keep all data synthetic.
- Avoid using production credentials, customer data, account identifiers, order details, or real service endpoints.
- Any future agent action should be inspectable, logged, reversible where possible, and blocked from real trading or money movement in this POC.
