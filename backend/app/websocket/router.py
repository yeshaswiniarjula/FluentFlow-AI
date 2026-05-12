from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.sessions.manager import SessionManager
from app.states.machine import ConversationStateMachine
from app.websocket.handler import WebSocketHandler
from app.websocket.pipeline import PipelineController
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

def get_session_manager():
    return SessionManager()

@router.websocket("/conversation")
async def websocket_endpoint(
    websocket: WebSocket,
    session_manager: SessionManager = Depends(get_session_manager)
):
    # 2. Create session
    session = await session_manager.create_session()
    session_id = str(session.session_id)
    
    # 3. Create state machine
    state_machine = ConversationStateMachine(session_id=session_id)
    
    # 4. Create handler
    handler = WebSocketHandler(
        websocket=websocket,
        session_id=session_id,
        state_machine=state_machine,
        session_manager=session_manager
    )
    
    # 5. Create pipeline
    pipeline = PipelineController(
        session_id=session_id,
        websocket_handler=handler,
        state_machine=state_machine,
        session_manager=session_manager
    )
    
    # 6. Inject pipeline into handler
    handler.pipeline = pipeline
    
    # 7. Connect (Accepts connection inside)
    await handler.connect()
    
    # 8. Try / Except loop
    try:
        await handler.receive_loop()
    except WebSocketDisconnect:
        # 9. Cleanup on disconnect
        await handler.disconnect()
        await pipeline.cleanup()
        await session_manager.delete_session(session_id)
        logger.info(f"[{session_id}] Cleaned up session after WebSocketDisconnect")
    except Exception as e:
        logger.error(f"[{session_id}] Unexpected error in websocket_endpoint: {e}")
        await handler.disconnect()
        await pipeline.cleanup()
        await session_manager.delete_session(session_id)
