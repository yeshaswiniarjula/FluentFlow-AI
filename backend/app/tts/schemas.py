from pydantic import BaseModel
from typing import Optional

class TTSResult(BaseModel):
    audio_bytes: Optional[bytes] = None
    content_type: str = "audio/mpeg"
    latency_ms: int = 0
    success: bool = False
    error_message: Optional[str] = None
