import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, update, delete
from app.utils.logger import get_logger
from database.connection import AsyncSessionLocal
from database.models import Session

logger = get_logger(__name__)

class SessionManager:
    async def create_session(self) -> Session:
        async with AsyncSessionLocal() as db:
            session_id = uuid.uuid4()
            new_session = Session(
                session_id=session_id,
                state="IDLE",
                conversation=[]
            )
            db.add(new_session)
            await db.commit()
            await db.refresh(new_session)
            logger.info(f"Session created: {session_id}")
            return new_session

    async def get_session(self, session_id: str | uuid.UUID) -> Optional[Session]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Session).where(Session.session_id == str(session_id)))
            return result.scalars().first()

    async def update_state(self, session_id: str | uuid.UUID, new_state: str) -> bool:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                update(Session)
                .where(Session.session_id == str(session_id))
                .values(state=new_state, updated_at=datetime.now(timezone.utc))
            )
            await db.commit()
            return result.rowcount > 0

    async def append_message(self, session_id: str | uuid.UUID, role: str, content: str) -> bool:
        if role not in ["user", "assistant"]:
            raise ValueError("role must be 'user' or 'assistant'")
        
        async with AsyncSessionLocal() as db:
            # We can do a read-modify-write for the JSON conversation array
            db_session = await self.get_session(session_id)
            if not db_session:
                return False
                
            new_message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            updated_conversation = list(db_session.conversation)
            updated_conversation.append(new_message)
            
            result = await db.execute(
                update(Session)
                .where(Session.session_id == str(session_id))
                .values(conversation=updated_conversation, updated_at=datetime.now(timezone.utc))
            )
            await db.commit()
            return result.rowcount > 0

    async def update_transcript(self, session_id: str | uuid.UUID, transcript: str) -> bool:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                update(Session)
                .where(Session.session_id == str(session_id))
                .values(last_transcript=transcript, updated_at=datetime.now(timezone.utc))
            )
            await db.commit()
            return result.rowcount > 0

    async def delete_session(self, session_id: str | uuid.UUID) -> bool:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                delete(Session).where(Session.session_id == str(session_id))
            )
            await db.commit()
            if result.rowcount > 0:
                logger.info(f"Session deleted: {session_id}")
                return True
            return False

    async def get_conversation_history(self, session_id: str | uuid.UUID) -> List[Dict[str, Any]]:
        db_session = await self.get_session(session_id)
        if db_session:
            return db_session.conversation
        return []
