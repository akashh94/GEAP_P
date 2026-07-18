from .base import BaseModel


class SectorAllocation(BaseModel):
    sector_name: str
    market_value: float
    portfolio_weight: float
