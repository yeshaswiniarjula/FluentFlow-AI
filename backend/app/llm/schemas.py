from pydantic import BaseModel
from typing import Optional

class LLMResponse(BaseModel):
    content: str = ""
    tokens_used: int = 0
    latency_ms: int = 0
    success: bool = False
    error_message: Optional[str] = None
