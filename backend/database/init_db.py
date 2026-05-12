import asyncio
import logging
import os
import sys
from alembic.config import Config
from alembic import command

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database.connection import test_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db():
    try:
        logger.info("Testing database connection...")
        await test_connection()
        logger.info("Database connection successful.")
        
        logger.info("Running Alembic migrations...")
        
        # Run Alembic upgrade synchronously within our async wrapper
        # Using run_in_executor to avoid blocking the event loop
        loop = asyncio.get_running_loop()
        alembic_cfg = Config("alembic.ini")
        
        def run_upgrade():
            command.upgrade(alembic_cfg, "head")
            
        await loop.run_in_executor(None, run_upgrade)
        
        logger.info("Migrations applied successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(init_db())
