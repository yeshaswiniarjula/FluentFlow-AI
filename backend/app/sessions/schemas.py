from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class SessionCreate(BaseModel):
    pass

class MessageAppend(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str

class SessionResponse(BaseModel):
    session_id: UUID
    state: str
    conversation: List[Dict[str, Any]]
    last_transcript: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
