"""Shared mock quote and market-summary tools."""

from geap_agent.config.container import brokerage_service


def get_quote(symbol: str) -> dict:
    """Return a deterministic mock quote for a supported portfolio symbol."""
    quote = brokerage_service.get_quote(symbol)
    if quote is None:
        return {"error": f"No mock quote is available for {symbol.upper().strip()}."}
    return quote.to_dict()


def get_market_summary() -> list[dict]:
    """Return deterministic mock index and market data."""
    return [index.to_dict() for index in brokerage_service.get_market_summary()]
