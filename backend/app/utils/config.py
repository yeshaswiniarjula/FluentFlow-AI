import sys
from pydantic_settings import BaseSettings
from pydantic import validator, ValidationError
from typing import Optional

class Settings(BaseSettings):
    groq_api_key: str = ""
    deepgram_api_key: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    livekit_url: str = "wss://fluentflow.livekit.cloud" # Placeholder
    database_url: str = "sqlite+aiosqlite:///./test.db"
    groq_model: str = "llama-3.3-70b-versatile"
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    @validator('groq_api_key', pre=True, always=True)
    def validate_groq_key(cls, v):
        if not v:
            return ""
        if len(v) < 10:
            raise ValueError("GROQ_API_KEY appears invalid (must be at least 10 chars)")
        return v
        
    @validator('database_url', pre=True, always=True)
    def validate_db_url(cls, v):
        if not v:
            return "sqlite+aiosqlite:///./test.db"
        # Auto-upgrade bare postgresql:// or postgres:// -> postgresql+asyncpg://
        if v.startswith('postgresql://'):
            return v.replace('postgresql://', 'postgresql+asyncpg://', 1)
        if v.startswith('postgres://'):
            return v.replace('postgres://', 'postgresql+asyncpg://', 1)
        # Accept asyncpg, sqlite, and railway internal (will be replaced at runtime)
        if v.startswith(('postgresql+asyncpg://', 'sqlite+aiosqlite://', 'sqlite://')):
            return v
        # Railway internal URLs — accepted; connection.py handles fallback to SQLite
        if 'railway.internal' in v:
            return v
        raise ValueError(f"DATABASE_URL has unsupported scheme: {v}")

    @property
    def is_configured(self) -> bool:
        return all([self.groq_api_key, self.deepgram_api_key, self.livekit_api_key, self.livekit_api_secret])

    def get_missing_settings(self) -> list:
        missing = []
        if not self.groq_api_key: missing.append("GROQ_API_KEY")
        if not self.deepgram_api_key: missing.append("DEEPGRAM_API_KEY")
        if not self.livekit_api_key: missing.append("LIVEKIT_API_KEY")
        if not self.livekit_api_secret: missing.append("LIVEKIT_API_SECRET")
        return missing

# Safe initialization to prevent startup crashes
settings = None
config_error_message = None

try:
    settings = Settings()
    if not settings.is_configured:
        config_error_message = f"Missing environment variables: {', '.join(settings.get_missing_settings())}"
except ValidationError as e:
    config_error_message = f"Validation Error on startup: {str(e)}"
    
    # Fallback structure to prevent NameError/AttributeError across the app
    class FallbackSettings:
        groq_api_key = ""
        deepgram_api_key = ""
        livekit_api_key = ""
        livekit_api_secret = ""
        livekit_url = "wss://fluentflow.livekit.cloud"
        database_url = "sqlite+aiosqlite:///./test.db"
        groq_model = "llama-3.3-70b-versatile"
        log_level = "INFO"
        
        @property
        def is_configured(self) -> bool:
            return False
            
        def get_missing_settings(self) -> list:
            return ["GROQ_API_KEY", "DEEPGRAM_API_KEY", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
            
    settings = FallbackSettings()

if config_error_message:
    print(f"WARNING: FluentFlow AI is not fully configured!\nReason: {config_error_message}\nThe server will start, but audio session token generation will fail until these are configured.")

