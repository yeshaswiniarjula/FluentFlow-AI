from pydantic import BaseModel
from typing import Optional

class CorrectionResult(BaseModel):
    has_correction: bool
    original: str
    corrected: Optional[str] = None
    friendly_message: Optional[str] = None
    latency_ms: int = 0
