from app.utils.logger import get_logger
from app.states.machine import State
from app.websocket.events import EventType

logger = get_logger(__name__)

class STTProcessor:
    def __init__(self, groq_stt, session_manager, state_machine, websocket_handler, pipeline_controller=None):
        self.groq_stt = groq_stt
        self.session_manager = session_manager
        self.state_machine = state_machine
        self.websocket_handler = websocket_handler
        self.pipeline_controller = pipeline_controller

    async def process_audio(self, session_id: str, audio_bytes: bytes):
        try:
            # 1. Transition state: LISTENING -> TRANSCRIBING
            await self.state_machine.transition(State.TRANSCRIBING, "audio processing started")
            
            # 2. Update DB state
            await self.session_manager.update_state(session_id, State.TRANSCRIBING.name)
            
            # 3. Call groq_stt.transcribe
            result = await self.groq_stt.transcribe(audio_bytes)
            
            # 5. If failure -> Retry once
            if not result.success:
                logger.warning(f"[{session_id}] STT failed ({result.error_message}), retrying once...")
                result = await self.groq_stt.transcribe(audio_bytes)
                
            # 4. If success
            if result.success:
                logger.info(f"[{session_id}] STT successful: {result.transcript[:50]}")
                
                # Update DB last_transcript
                await self.session_manager.update_transcript(session_id, result.transcript)
                
                # Send to client
                await self.websocket_handler.send_event(
                    EventType.TRANSCRIPT.value, 
                    {"text": result.transcript, "confidence": result.confidence}
                )
                
                # Transition: TRANSCRIBING -> THINKING
                await self.state_machine.transition(State.THINKING, "STT complete")
                await self.session_manager.update_state(session_id, State.THINKING.name)
                
                # Fire on_transcript_received
                if self.pipeline_controller and hasattr(self.pipeline_controller, 'on_transcript_received'):
                    await self.pipeline_controller.on_transcript_received(session_id, result.transcript)
            
            # 5. If failure (after retry)
            else:
                logger.error(f"[{session_id}] STT failed after retry: {result.error_message}")
                await self.websocket_handler.send_event(
                    EventType.ERROR.value, 
                    {"message": "Failed to transcribe audio"}
                )
                await self.state_machine.transition(State.ERROR, "STT unrecoverable failure")
                await self.session_manager.update_state(session_id, State.ERROR.name)
                
        except Exception as e:
            logger.error(f"[{session_id}] Exception in process_audio: {e}")
            await self.state_machine.transition(State.ERROR, "STT exception")
            await self.session_manager.update_state(session_id, State.ERROR.name)
            await self.websocket_handler.send_event(
                EventType.ERROR.value, 
                {"message": "Internal error during transcription"}
            )
