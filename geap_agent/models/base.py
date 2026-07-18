from typing import Any

from pydantic import BaseModel as PydanticBaseModel


class BaseModel(PydanticBaseModel):
    """Base class for all domain models, backed by Pydantic v2.

    Inheriting from ``pydantic.BaseModel`` gives us seamless schema
    inference for ADK tools (FunctionTool, input_schema, etc.), automatic
    JSON serialization, and validation — without changing the interface
    that tool code already uses.
    """

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(mode='python')
