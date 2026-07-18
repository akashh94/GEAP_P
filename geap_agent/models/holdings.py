from .base import BaseModel


class Holding(BaseModel):
    symbol: str
    company_name: str
    shares: float
    current_price: float
    average_cost: float
    market_value: float
    day_change: float
    day_change_percent: float
    total_return: float
    total_return_percent: float
    portfolio_weight: float
