import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.schema import CreateTable
from sqlalchemy.exc import SQLAlchemyError
from app.utils.config import settings

logger = logging.getLogger(__name__)

if not settings.database_url:
    raise ValueError("DATABASE_URL is not set in the environment variables.")

import os

# Determine if we are running inside a Railway environment
is_railway = os.environ.get("RAILWAY_ENVIRONMENT") is not None or os.environ.get("RAILWAY_STATIC_URL") is not None

db_url = settings.database_url
if not db_url:
    logger.info("No database URL provided. Using local SQLite.")
    db_url = "sqlite+aiosqlite:////tmp/test.db" if is_railway else "sqlite+aiosqlite:///./test.db"
elif "railway.internal" in db_url and not is_railway:
    logger.info("Internal Railway URL detected locally. Falling back to local SQLite for testing.")
    db_url = "sqlite+aiosqlite:///./test.db"
elif "sqlite" in db_url and is_railway:
    # Ensure SQLite uses /tmp on Railway to avoid read-only filesystem errors
    if ":///./" in db_url:
        db_url = db_url.replace(":///./", ":////tmp/")
    elif ":///" in db_url and not db_url.startswith("sqlite+aiosqlite:////tmp/"):
        db_url = "sqlite+aiosqlite:////tmp/test.db"

# SQLAlchemy async engine
engine_args = {"echo": False}
if db_url.startswith("postgresql"):
    engine_args.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30
    })

async_engine = create_async_engine(db_url, **engine_args)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db():
    """Dependency for getting async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()

async def test_connection() -> bool:
    """Test the database connection."""
    from sqlalchemy import text
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError as e:
        logger.error(f"Database connection failed: {e}")
        return False # Changed to return False instead of raising to allow fallback logic

async def create_tables():
    """Create all tables in the database."""
    from database.models import Base
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
