from pydantic import BaseModel
from typing import Optional

class TranscriptionResult(BaseModel):
    transcript: str = ""
    confidence: float = 0.0
    duration_ms: int = 0
    success: bool = False
    error_message: Optional[str] = None
