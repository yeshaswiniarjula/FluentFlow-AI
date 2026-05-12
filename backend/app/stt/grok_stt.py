import time
import httpx
import asyncio
from app.utils.config import settings
from app.utils.logger import get_logger
from app.stt.schemas import TranscriptionResult

logger = get_logger(__name__)

class GrokSTT:
    def __init__(self):
        self.api_key = settings.grok_api_key
        self.api_url = "https://api.x.ai/v1/audio/transcriptions"
    
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> TranscriptionResult:
        return await self._transcribe_with_retry(audio_bytes, language, retries=1)

    async def _transcribe_with_retry(self, audio_bytes: bytes, language: str, retries: int) -> TranscriptionResult:
        start_time = time.time()
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
        data = {"model": "grok-audio-1", "language": language}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url, 
                    headers=headers, 
                    data=data, 
                    files=files
                )
                
                duration_ms = int((time.time() - start_time) * 1000)
                logger.info(f"STT call completed in {duration_ms} ms")
                
                if response.status_code >= 400:
                    logger.error(f"Grok STT API error {response.status_code}: {response.text}")
                    return TranscriptionResult(
                        duration_ms=duration_ms,
                        success=False,
                        error_message=f"API Error {response.status_code}: {response.text}"
                    )
                    
                resp_json = response.json()
                return TranscriptionResult(
                    transcript=resp_json.get("text", ""),
                    confidence=resp_json.get("confidence", 1.0),
                    duration_ms=duration_ms,
                    success=True
                )
                
        except httpx.TimeoutException:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"STT call timed out after {duration_ms} ms")
            return TranscriptionResult(
                duration_ms=duration_ms,
                success=False,
                error_message="STT timeout"
            )
            
        except httpx.RequestError as e:
            if retries > 0:
                logger.warning(f"Network error calling STT: {e}. Retrying after 500ms...")
                await asyncio.sleep(0.5)
                return await self._transcribe_with_retry(audio_bytes, language, retries=retries - 1)
                
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"STT network error after retries: {e}")
            return TranscriptionResult(
                duration_ms=duration_ms,
                success=False,
                error_message=f"Network error: {str(e)}"
            )
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Unexpected error in STT: {e}")
            return TranscriptionResult(
                duration_ms=duration_ms,
                success=False,
                error_message=f"Unexpected error: {str(e)}"
            )
