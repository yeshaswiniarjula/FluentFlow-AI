import json
import traceback
from datetime import datetime, timezone
from typing import Union, Dict, Any
from app.utils.logger import get_logger
from app.states.machine import State
from app.websocket.events import EventType

logger = get_logger(__name__)

class MessageRouter:
    def __init__(self, handler, state_machine, session_manager, pipeline_controller=None):
        self.handler = handler
        self.state_machine = state_machine
        self.session_manager = session_manager
        self.pipeline_controller = pipeline_controller
        self.last_seq_num = -1

    async def route(self, raw_message: Union[str, Dict[str, Any]]):
        try:
            if isinstance(raw_message, str):
                try:
                    message = json.loads(raw_message)
                except json.JSONDecodeError:
                    await self.handler.send_event("error", {"message": "Invalid message format"})
                    return
            else:
                message = raw_message

            msg_type = message.get("type")
            
            if msg_type == "audio_chunk":
                await self.handle_audio_chunk(message)
            elif msg_type == "interrupt_signal":
                await self.handle_interrupt_signal(message)
            elif msg_type == "ping":
                await self.handle_ping(message)
            else:
                await self.handle_unknown(msg_type)
                
        except Exception as e:
            logger.error(f"[{self.handler.session_id}] Error routing message: {e}\n{traceback.format_exc()}")
            await self.handler.send_event("error", {"message": "Internal server error while processing message"})

    async def handle_audio_chunk(self, data: dict):
        if not self.state_machine.is_in(State.LISTENING):
            logger.warning(f"[{self.handler.session_id}] Received audio chunk but state is {self.state_machine.current_state.name}, discarding.")
            return
            
        seq_num = data.get("seq", 0)
        if self.last_seq_num != -1 and seq_num != self.last_seq_num + 1:
            logger.warning(f"[{self.handler.session_id}] Audio chunk gap detected. Expected {self.last_seq_num + 1}, got {seq_num}")
            
        self.last_seq_num = seq_num
        
        if self.pipeline_controller:
            # Assuming a method exists in the yet-to-be-built pipeline controller
            await self.pipeline_controller.process_audio(data)

    async def handle_interrupt_signal(self, data: dict):
        if self.state_machine.is_in(State.SPEAKING):
            if self.pipeline_controller and hasattr(self.pipeline_controller, 'on_interrupt_detected'):
                await self.pipeline_controller.on_interrupt_detected()
            logger.info(f"[{self.handler.session_id}] Interrupt received and processed in SPEAKING state")
        else:
            logger.info(f"[{self.handler.session_id}] Interrupt received but not in SPEAKING state, ignoring")

    async def handle_ping(self, data: dict):
        await self.handler.send_event("pong", {})

    async def handle_unknown(self, message_type: str):
        logger.warning(f"[{self.handler.session_id}] Unknown message type received: {message_type}")
