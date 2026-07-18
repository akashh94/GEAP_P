from abc import ABC, abstractmethod

from geap_agent.models.account import Account
from geap_agent.models.holdings import Holding
from geap_agent.models.market import MarketIndex
from geap_agent.models.portfolio import PortfolioSummary
from geap_agent.models.quote import Quote
from geap_agent.models.sector import SectorAllocation



class BrokerageService(ABC):
    """
    Abstract interface for all brokerage providers.

    Agents and tools depend on this interface instead of a concrete
    brokerage implementation.
    """

    @abstractmethod
    def get_accounts(self) -> list[Account]:
        ...

    @abstractmethod
    def get_portfolio_summary(self) -> PortfolioSummary:
        ...

    @abstractmethod
    def get_holdings(self) -> list[Holding]:
        ...

    @abstractmethod
    def get_sector_allocation(self) -> list[SectorAllocation]:
        ...

    @abstractmethod
    def get_quote(self, symbol: str) -> Quote | None:
        ...

    @abstractmethod
    def get_market_summary(self) -> list[MarketIndex]:
        ...

    @abstractmethod
    def get_faq(self) -> list[dict[str, str]]:
        ...
