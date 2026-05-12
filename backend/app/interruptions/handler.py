import asyncio
import time
from typing import Optional
from app.utils.logger import get_logger
from app.states.machine import State
from app.websocket.events import EventType

logger = get_logger(__name__)

class InterruptionHandler:
    def __init__(self, state_machine, session_manager, websocket_handler):
        self.state_machine = state_machine
        self.session_manager = session_manager
        self.websocket_handler = websocket_handler
        self._active_tts_task: Optional[asyncio.Task] = None
        self._active_llm_task: Optional[asyncio.Task] = None

    def register_tts_task(self, task: asyncio.Task):
        self._active_tts_task = task

    def register_llm_task(self, task: asyncio.Task):
        self._active_llm_task = task

    async def on_interrupt_detected(self, session_id: str):
        # 1. Record interrupt_start_time
        interrupt_start_time = time.monotonic()
        
        # 2. Cancel TTS Task
        if self._active_tts_task and not self._active_tts_task.done():
            self._active_tts_task.cancel()
            logger.info(f"[{session_id}] TTS task cancelled")
            
        # 3. Cancel LLM Task
        if self._active_llm_task and not self._active_llm_task.done():
            self._active_llm_task.cancel()
            logger.info(f"[{session_id}] LLM task cancelled")
            
        # 4. Transition state machine to INTERRUPTED
        try:
            if self.state_machine.current_state in [State.SPEAKING, State.THINKING]:
                await self.state_machine.transition(State.INTERRUPTED, "Interrupt detected")
        except Exception:
            # Safely catch if transition errors (e.g. state updated concurrently)
            pass
            
        # 5. Update DB state
        await self.session_manager.update_state(session_id, State.INTERRUPTED.name)
        
        # 6. Send to client
        await self.websocket_handler.send_event(
            EventType.INTERRUPTED.value,
            {"message": "AI stopped, listening..."}
        )
        
        # 7. Await brief cleanup: 50ms for tasks to cleanly cancel inside the event loop
        await asyncio.sleep(0.05)
        
        # 8. Transition state machine INTERRUPTED -> LISTENING
        try:
            if self.state_machine.current_state == State.INTERRUPTED:
                await self.state_machine.transition(State.LISTENING, "Interrupt cleanup done")
        except Exception:
            pass
            
        # 9. Update DB state to LISTENING
        await self.session_manager.update_state(session_id, State.LISTENING.name)
        
        # 10. Send state change to client
        await self.websocket_handler.send_event(
            EventType.STATE_CHANGE.value,
            {"state": State.LISTENING.name}
        )
        
        # 11. Clear active task references
        self._active_tts_task = None
        self._active_llm_task = None
        
        # 12. Log total handling time
        handling_time = time.monotonic() - interrupt_start_time
        logger.info(f"[{session_id}] Interrupt handled in {handling_time:.3f}s")
        if handling_time > 0.3:
            logger.warning(f"[{session_id}] Interrupt handling time exceeded 300ms target: {handling_time:.3f}s")

    async def reset(self):
        if self._active_tts_task and not self._active_tts_task.done():
            self._active_tts_task.cancel()
        if self._active_llm_task and not self._active_llm_task.done():
            self._active_llm_task.cancel()
            
        self._active_tts_task = None
        self._active_llm_task = None
