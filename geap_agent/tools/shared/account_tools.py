"""Shared mock account, holdings, sector-allocation, and FAQ tools."""

from geap_agent.config.container import brokerage_service


def get_account_summary() -> dict:
    """Return the active mock account's balances and portfolio performance."""
    return brokerage_service.get_portfolio_summary().to_dict()


def get_portfolio_holdings() -> list[dict]:
    """Return all mock holdings with allocation and performance fields."""
    return [holding.to_dict() for holding in brokerage_service.get_holdings()]


def get_sector_allocation() -> list[dict]:
    """Return the active mock portfolio's allocation by sector."""
    return [sector.to_dict() for sector in brokerage_service.get_sector_allocation()]


def get_faq(query: str = "") -> list[dict]:
    """Return mock brokerage support FAQ entries, optionally filtered by text."""
    entries = brokerage_service.get_faq()
    query = query.strip().lower()
    return [
        entry
        for entry in entries
        if not query or query in f"{entry['question']} {entry['answer']}".lower()
    ]
