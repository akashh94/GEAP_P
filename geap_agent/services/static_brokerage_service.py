"""Deterministic mock data used until an E*TRADE provider is available."""

from geap_agent.models.account import Account
from geap_agent.models.holdings import Holding
from geap_agent.models.market import MarketIndex
from geap_agent.models.portfolio import PortfolioSummary
from geap_agent.models.quote import Quote
from geap_agent.models.sector import SectorAllocation
from geap_agent.services.brokerage_service import BrokerageService


class StaticBrokerageService(BrokerageService):
    """In-memory brokerage provider that mirrors the front-end demo data.

    This class deliberately has no network dependency. Replace it with an
    E*TRADE-backed implementation while preserving the BrokerageService API.
    """

    def __init__(self) -> None:
        raw_holdings = [
            ("AAPL", "Apple Inc.", 150, 145.20, 198.75, "Technology", 1.85, 0.94),
            ("GOOGL", "Alphabet Inc.", 45, 122.50, 178.42, "Technology", -0.63, -0.35),
            ("MSFT", "Microsoft Corp.", 80, 310.00, 445.18, "Technology", 2.34, 0.53),
            ("AMZN", "Amazon.com Inc.", 60, 135.75, 194.63, "Consumer Disc.", 0.91, 0.47),
            ("NVDA", "NVIDIA Corp.", 35, 480.00, 892.50, "Technology", 12.40, 1.41),
            ("TSLA", "Tesla Inc.", 40, 245.80, 268.35, "Consumer Disc.", -3.15, -1.16),
            ("VTI", "Vanguard Total Stock Mkt", 120, 205.00, 262.80, "ETF - Broad", 0.45, 0.17),
            ("QQQ", "Invesco QQQ Trust", 55, 365.00, 498.72, "ETF - Tech", 1.28, 0.26),
            ("BND", "Vanguard Total Bond Mkt", 200, 73.50, 72.15, "ETF - Bonds", 0.08, 0.11),
            ("GLD", "SPDR Gold Shares", 30, 178.00, 215.40, "ETF - Commodity", 0.72, 0.34),
            ("JPM", "JPMorgan Chase & Co.", 50, 148.90, 198.25, "Financials", 0.95, 0.48),
            ("JNJ", "Johnson & Johnson", 45, 162.30, 157.80, "Healthcare", -0.42, -0.27),
        ]
        market_values = [shares * price for _, _, shares, _, price, _, _, _ in raw_holdings]
        total_market_value = sum(market_values)
        self._sectors: dict[str, float] = {}
        self._holdings = []
        for (symbol, name, shares, cost, price, sector, daily, daily_pct), value in zip(raw_holdings, market_values):
            self._sectors[sector] = self._sectors.get(sector, 0) + value
            self._holdings.append(Holding(
                symbol=symbol, company_name=name, shares=shares, current_price=price,
                average_cost=cost, market_value=round(value, 2), day_change=round(shares * daily, 2),
                day_change_percent=daily_pct, total_return=round(value - shares * cost, 2),
                total_return_percent=round((price - cost) / cost * 100, 2),
                portfolio_weight=round(value / total_market_value * 100, 2),
            ))
        self._cash_balance = 14869.92
        self._quotes = self._build_quotes()

    def _build_quotes(self) -> dict[str, Quote]:
        quotes = {}
        for holding in self._holdings:
            price = holding.current_price
            quotes[holding.symbol] = Quote(
                symbol=holding.symbol, company_name=holding.company_name, price=price,
                change=holding.day_change / holding.shares,
                change_percent=holding.day_change_percent, open_price=round(price * 0.995, 2),
                high_price=round(price * 1.012, 2), low_price=round(price * 0.988, 2),
                volume=12_500_000, average_volume=18_000_000, market_cap="1.2T",
                pe_ratio=25.0, eps=round(price / 25.0, 2), week_52_high=round(price * 1.2, 2),
                week_52_low=round(price * 0.75, 2), dividend_yield=1.2,
            )
        return quotes

    def get_accounts(self) -> list[Account]:
        summary = self.get_portfolio_summary()
        return [Account(
            account_id="demo-4821", account_name="Jonathan Doe",
            account_type="Individual Brokerage", masked_account_number="****4821",
            total_value=summary.total_value, cash_balance=self._cash_balance,
        )]

    def get_holdings(self) -> list[Holding]:
        return self._holdings.copy()

    def get_portfolio_summary(self) -> PortfolioSummary:
        holdings_value = sum(item.market_value for item in self._holdings)
        total_cost = sum(item.market_value - item.total_return for item in self._holdings)
        total_value = round(holdings_value + self._cash_balance, 2)
        day_change = round(sum(item.day_change for item in self._holdings), 2)
        total_return = round(total_value - total_cost, 2)
        return PortfolioSummary(
            total_value=total_value,
            cash_balance=self._cash_balance,
            day_change=day_change,
            day_change_percent=round(day_change / (total_value - day_change) * 100, 4),
            total_return=total_return,
            total_return_percent=round(total_return / total_cost * 100, 2),
            holdings=self.get_holdings(),
            top_holdings=sorted(self.get_holdings(), key=lambda item: item.market_value, reverse=True)[:5],
        )

    def get_sector_allocation(self) -> list[SectorAllocation]:
        total = sum(self._sectors.values())
        return [
            SectorAllocation(sector_name=name, market_value=round(value, 2), portfolio_weight=round(value / total * 100, 2))
            for name, value in sorted(self._sectors.items(), key=lambda item: item[1], reverse=True)
        ]

    def get_quote(self, symbol: str) -> Quote | None:
        return self._quotes.get(symbol.upper().strip())

    def get_market_summary(self) -> list[MarketIndex]:
        return [
            MarketIndex(symbol="SPX", name="S&P 500", value=5482.87, change=18.42, change_percent=0.34),
            MarketIndex(symbol="COMP", name="NASDAQ", value=17384.56, change=72.35, change_percent=0.42),
            MarketIndex(symbol="DJI", name="DOW", value=39872.43, change=-45.12, change_percent=-0.11),
            MarketIndex(symbol="RUT", name="Russell 2K", value=2087.65, change=8.93, change_percent=0.43),
            MarketIndex(symbol="BTC", name="BTC/USD", value=98452.30, change=1247.80, change_percent=1.28),
            MarketIndex(symbol="TNX", name="10Y Yield", value=4.28, change=-0.03, change_percent=-0.70),
        ]

    def get_faq(self) -> list[dict[str, str]]:
        return [
            {"question": "How do I transfer funds?", "answer": "Go to Account > Transfers, link a bank account, and initiate an ACH transfer. Transfers typically take 1-3 business days."},
            {"question": "What are the trading fees?", "answer": "US stocks and ETFs are commission-free. Options trades are $0.65 per contract."},
            {"question": "How do I enable margin?", "answer": "Navigate to Account Settings > Margin. A minimum balance of $2,000 and a margin agreement are required."},
            {"question": "Where are my tax documents?", "answer": "1099-B and 1099-DIV documents are in Account > Documents > Tax Documents, typically by mid-February."},
            {"question": "What order types are available?", "answer": "Market, Limit, Stop, and Stop-Limit orders are available as Day or GTC orders."},
        ]
