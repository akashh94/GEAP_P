"""Financial-information search tool: local brokerage data and public sources."""

from geap_agent.config.container import brokerage_service


_SEARCH_SOURCES = {
    "yahoo": "Yahoo Finance",
    "bloomberg": "Bloomberg",
    "reuters": "Reuters",
    "morningstar": "Morningstar",
    "sec": "SEC Edgar",
}


def search_financial_info(query: str = "", source: str = "") -> dict:
    """Search broker data and public financial sources by keyword.

    When *query* mentions holdings, portfolio, or shares, the tool returns
    live (mock) portfolio data.  For public financial information the tool
    can optionally filter by *source* (yahoo, bloomberg, reuters,
    morningstar, sec).
    """
    q = query.strip().lower() if query else ""

    # ── Tier 1: private brokerage data ──
    if q and any(kw in q for kw in ("holdings", "portfolio", "shares", "position")):
        holdings = brokerage_service.get_holdings()
        summary = brokerage_service.get_portfolio_summary()
        rows = [
            f"{h.symbol} ({h.company_name}): {h.shares} shares @ ${h.current_price:.2f} "
            f"= ${h.market_value:,.2f} | {h.day_change_percent:+.2f}% day | "
            f"weight {h.portfolio_weight:.1f}%"
            for h in holdings
        ]
        return {
            "results": rows,
            "source": "Live Portfolio",
            "summary": {
                "total_value": summary.total_value,
                "cash_balance": summary.cash_balance,
                "holdings_count": len(holdings),
            },
        }

    if q and any(kw in q for kw in ("transactions", "trades", "history")):
        return {
            "results": [
                "Mock data: recent trades include BUY AAPL 10 shares @ $198.50 on 2026-07-08",
                "Mock data: BUY MSFT 5 shares @ $443.00 on 2026-07-07",
            ],
            "source": "Transaction History (Mock)",
        }

    # ── Tier 2: source requested but no implementation yet ──
    src_label = _SEARCH_SOURCES.get(source.strip().lower()) if source else None
    if src_label:
        return {
            "results": [
                f"Public web search for \"{query}\" via {src_label} is not yet "
                "connected. Add an API key or web-search backend to enable "
                "live financial-news retrieval.",
            ],
            "source": src_label,
            "status": "integration_pending",
        }

    # ── Tier 3: list available sources ──
    if not q:
        return {
            "results": [f"Search via {label} (key: {key})" for key, label in _SEARCH_SOURCES.items()],
            "source": "Available Sources",
        }

    return {
        "results": [f"No data found for \"{query}\" in local brokerage or public sources."],
        "source": "search_financial_info",
    }
