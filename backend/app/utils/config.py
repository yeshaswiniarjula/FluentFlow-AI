import sys
from pydantic_settings import BaseSettings
from pydantic import validator, ValidationError
from typing import Optional

class Settings(BaseSettings):
    groq_api_key: str
    deepgram_api_key: str
    livekit_api_key: str
    livekit_api_secret: str
    livekit_url: str = "wss://fluentflow.livekit.cloud" # Placeholder
    database_url: str = "sqlite+aiosqlite:///./test.db"
    groq_model: str = "llama-3.3-70b-versatile"
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    @validator('groq_api_key')
    def validate_groq_key(cls, v):
        if not v or len(v) < 10:
            raise ValueError("GROQ_API_KEY appears invalid")
        return v
        
    @validator('database_url')
    def validate_db_url(cls, v):
        if not v:
            return "sqlite+aiosqlite:///./test.db"
        # Auto-upgrade bare postgresql:// -> postgresql+asyncpg://
        if v.startswith('postgresql://'):
            return v.replace('postgresql://', 'postgresql+asyncpg://', 1)
        # Accept asyncpg, sqlite, and railway internal (will be replaced at runtime)
        if v.startswith(('postgresql+asyncpg://', 'sqlite+aiosqlite://', 'sqlite://')):
            return v
        # Railway internal URLs — accepted; connection.py handles fallback to SQLite
        if 'railway.internal' in v:
            return v
        raise ValueError(f"DATABASE_URL has unsupported scheme: {v}")

try:
    settings = Settings()
except ValidationError as e:
    print(f"FATAL: Invalid configuration:\n{e}")
    sys.exit(1)
