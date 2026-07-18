from .base import BaseModel


class Account(BaseModel):
    account_id: str
    account_name: str
    account_type: str
    masked_account_number: str
    total_value: float
    cash_balance: float
