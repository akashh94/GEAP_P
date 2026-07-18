"""Portfolio-specific analysis tools beyond the shared base."""

from geap_agent.config.container import brokerage_service


def get_concentration_analysis() -> dict:
    """Identify mock positions that exceed the 15% concentration threshold."""
    holdings = brokerage_service.get_holdings()
    concentrated = [holding for holding in holdings if holding.portfolio_weight > 15]
    return {
        "threshold_percent": 15,
        "largest_positions": [holding.to_dict() for holding in sorted(holdings, key=lambda item: item.portfolio_weight, reverse=True)[:5]],
        "concentrated_positions": [holding.to_dict() for holding in concentrated],
        "is_concentrated": bool(concentrated),
        "data_source": "mock brokerage data",
    }
