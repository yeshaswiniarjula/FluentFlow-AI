import asyncio
import base64
from app.utils.logger import get_logger
from app.states.machine import State

logger = get_logger(__name__)

class TTSStreamer:
    def __init__(self, deepgram_tts, websocket_handler, state_machine, session_manager):
        self.deepgram_tts = deepgram_tts
        self.websocket_handler = websocket_handler
        self.state_machine = state_machine
        self.session_manager = session_manager

    async def stream(self, session_id: str, text: str):
        try:
            result = await self.deepgram_tts.synthesize(text)
            
            if not result.success:
                logger.error(f"[{session_id}] TTS synthesis failed: {result.error_message}. Falling back to text-only.")
                await self.websocket_handler.send_event("ai_response_text_only", {"text": text})
                
                await self.state_machine.transition(State.LISTENING, "TTS fallback complete")
                await self.session_manager.update_state(session_id, State.LISTENING.name)
                return
                
            chunk_size = 4096
            audio_bytes = result.audio_bytes
            total_chunks = (len(audio_bytes) + chunk_size - 1) // chunk_size
            
            for i in range(total_chunks):
                chunk = audio_bytes[i*chunk_size : (i+1)*chunk_size]
                b64_chunk = base64.b64encode(chunk).decode('utf-8')
                is_last = (i == total_chunks - 1)
                
                await self.websocket_handler.send_event(
                    "audio_chunk",
                    {
                        "data": b64_chunk,
                        "chunk_index": i,
                        "is_last": is_last
                    }
                )
                
                await asyncio.sleep(0.01)
                
            await self.websocket_handler.send_event("audio_complete", {})
            # Frontend will send 'audio_finished' when playback is done, which triggers the transition to LISTENING

        except asyncio.CancelledError:
            logger.info(f"[{session_id}] TTS stream cancelled for session {session_id}")
            
            try:
                await self.websocket_handler.send_event("audio_cancelled", {})
            except Exception:
                pass
                
            try:
                if self.state_machine.current_state == State.SPEAKING:
                    await self.state_machine.transition(State.INTERRUPTED, "TTS stream interrupted")
                    await self.session_manager.update_state(session_id, State.INTERRUPTED.name)
            except Exception as e:
                logger.error(f"[{session_id}] Error transitioning state on TTS cancellation: {e}")
                
            raise
            
        except Exception as e:
            logger.error(f"[{session_id}] Unexpected error in TTSStreamer: {e}")
            try:
                await self.state_machine.transition(State.ERROR, "TTS stream error")
                await self.session_manager.update_state(session_id, State.ERROR.name)
            except Exception:
                pass
