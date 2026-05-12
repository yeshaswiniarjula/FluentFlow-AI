import asyncio
import json
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
from app.utils.logger import get_logger
from app.states.machine import ConversationStateMachine, State
from app.sessions.manager import SessionManager
from app.websocket.events import EventType
from app.websocket.registry import get_registry

logger = get_logger(__name__)

class WebSocketHandler:
    def __init__(self, websocket: WebSocket, session_id: str, state_machine: ConversationStateMachine, session_manager: SessionManager, pipeline=None):
        self.websocket = websocket
        self.session_id = session_id
        self.state_machine = state_machine
        self.session_manager = session_manager
        self.pipeline = pipeline
        self.heartbeat_task = None
        self.last_pong_time = datetime.now(timezone.utc)
        self.running_tasks = set()

    async def connect(self):
        await self.websocket.accept()
        await self.state_machine.transition(State.LISTENING, "user connects")
        await self.session_manager.update_state(self.session_id, State.LISTENING.name)
        
        await self.send_event(
            EventType.CONNECTED.value,
            {"session_id": self.session_id, "state": State.LISTENING.name}
        )
        
        self.heartbeat_task = asyncio.create_task(self.heartbeat_loop())
        self.running_tasks.add(self.heartbeat_task)
        get_registry().register(self)
        logger.info(f"[{self.session_id}] WebSocket connected.")

    async def disconnect(self, code=1000):
        try:
            try:
                await self.state_machine.transition(State.IDLE, "disconnect")
            except Exception:
                await self.state_machine.reset()
        except Exception as e:
            logger.error(f"[{self.session_id}] Error transitioning on disconnect: {e}")
            
        await self.session_manager.update_state(self.session_id, State.IDLE.name)
        
        for task in self.running_tasks:
            task.cancel()
            
        get_registry().unregister(self)
        logger.info(f"[{self.session_id}] WebSocket disconnected with code {code}.")

    async def send_event(self, event_type: str, data: dict):
        payload = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **data
        }
        try:
            await self.websocket.send_json(payload)
        except WebSocketDisconnect:
            logger.warning(f"[{self.session_id}] WebSocketDisconnect while sending {event_type}")
        except Exception as e:
            logger.error(f"[{self.session_id}] Error sending {event_type}: {e}")

    async def receive_loop(self):
        try:
            while True:
                text_data = await self.websocket.receive_text()
                try:
                    data = json.loads(text_data)
                except json.JSONDecodeError:
                    logger.warning(f"[{self.session_id}] Received invalid JSON")
                    continue
                
                event_type = data.get("type")
                
                if event_type == "audio_chunk":
                    if self.pipeline:
                        audio_data = data.get("audio")
                        if isinstance(audio_data, str):
                            import base64
                            try:
                                audio_data = base64.b64decode(audio_data)
                            except Exception as e:
                                logger.error(f"[{self.session_id}] Failed to decode base64 audio: {e}")
                                continue
                        await self.pipeline.on_audio_chunk(audio_data or b"")
                elif event_type == "speech_ended":
                    if self.pipeline:
                        await self.pipeline.on_speech_ended()
                elif event_type == "interrupt_signal":
                    if self.pipeline:
                        await self.pipeline.on_interrupt_detected()
                elif event_type == "audio_finished":
                    if self.pipeline:
                        await self.pipeline.on_audio_finished()
                elif event_type == "ping":
                    await self.send_event(EventType.PONG.value, {})
                elif event_type == "pong":
                    self.last_pong_time = datetime.now(timezone.utc)
                else:
                    logger.warning(f"[{self.session_id}] Received unknown event type: {event_type}")
                    
        except WebSocketDisconnect as e:
            await self.disconnect(e.code)
            raise e
        except Exception as e:
            logger.error(f"[{self.session_id}] Error in receive_loop: {e}")
            await self.disconnect()
            raise e

    async def heartbeat_loop(self):
        try:
            while True:
                await asyncio.sleep(30)
                await self.send_event(EventType.PING.value, {})
                
                await asyncio.sleep(5)
                time_since_pong = (datetime.now(timezone.utc) - self.last_pong_time).total_seconds()
                
                if time_since_pong > 35:
                    logger.warning(f"[{self.session_id}] No pong received in last 5 seconds.")
        except asyncio.CancelledError:
            logger.info(f"[{self.session_id}] Heartbeat task cancelled")
