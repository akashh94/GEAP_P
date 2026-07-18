from .base import BaseModel


class Quote(BaseModel):
    symbol: str
    company_name: str
    price: float
    change: float
    change_percent: float
    open_price: float
    high_price: float
    low_price: float
    volume: int
    average_volume: int
    market_cap: str
    pe_ratio: float | None
    eps: float | None
    week_52_high: float
    week_52_low: float
    dividend_yield: float | None
