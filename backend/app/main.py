import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
from uuid import UUID
from livekit import api
from app.utils.config import settings

from app.utils.logger import get_logger
from app.websocket.router import router as websocket_router
from database.connection import test_connection, async_engine
from app.sessions.manager import SessionManager
from app.sessions.schemas import SessionResponse
from app.websocket.registry import get_registry

logger = get_logger(__name__)
session_manager = SessionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("FluentFlow AI backend started")
    try:
        from database.connection import test_connection, create_tables
        await test_connection()
        await create_tables()
        app.state.db_status = "connected"
    except Exception as e:
        logger.warning(f"Database connection test failed on startup: {e}")
        app.state.db_status = "error"
    
    yield
    
    # Shutdown
    logger.info("FluentFlow AI backend shutting down")
    
    # Notify clients
    registry = get_registry()
    handlers = registry.get_all()
    if handlers:
        logger.info(f"Notifying {len(handlers)} clients of shutdown...")
        for handler in handlers:
            await handler.send_event("server_shutdown", {"message": "Reconnecting shortly..."})
        await asyncio.sleep(2)
        
    await async_engine.dispose()

app = FastAPI(
    title="FluentFlow AI",
    version="1.1.0",
    lifespan=lifespan
)

# CORS Middleware for MVP
# TODO: Restrict allowed origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    db_status = getattr(app.state, "db_status", "unknown")
    return {
        "status": "ok",
        "version": "1.1.0",
        "database": db_status
    }

@app.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: UUID):
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/api/session/{session_id}")
async def delete_session(session_id: UUID):
    deleted = await session_manager.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}

@app.get("/api/token")
async def get_livekit_token():
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    token.with_identity(str(uuid.uuid4()))
    token.with_name("Student")
    token.with_grants(api.VideoGrants(
        room_join=True,
        room="fluentflow-room"
    ))
    return {"token": token.to_jwt(), "url": settings.livekit_url}

# Register Routers
app.include_router(websocket_router, prefix="/ws", tags=["websocket"])
