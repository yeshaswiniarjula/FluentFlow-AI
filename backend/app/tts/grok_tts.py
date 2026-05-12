import time
import httpx
import asyncio
from app.utils.config import settings
from app.utils.logger import get_logger
from app.tts.schemas import TTSResult

logger = get_logger(__name__)

class GrokTTS:
    def __init__(self):
        self.api_key = settings.grok_api_key
        self.api_url = "https://api.x.ai/v1/audio/speech"

    async def synthesize(self, text: str) -> TTSResult:
        return await self._synthesize_with_retry(text, retries=1)

    async def _synthesize_with_retry(self, text: str, retries: int) -> TTSResult:
        start_time = time.time()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "grok-audio-1",
            "input": text,
            "voice": "default"
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url, 
                    headers=headers, 
                    json=payload
                )
                
                latency_ms = int((time.time() - start_time) * 1000)
                logger.info(f"TTS call completed in {latency_ms} ms")
                
                if response.status_code >= 400:
                    if retries > 0:
                        logger.warning(f"Grok TTS API error {response.status_code}. Retrying...")
                        await asyncio.sleep(0.5)
                        return await self._synthesize_with_retry(text, retries=retries - 1)
                        
                    logger.error(f"Grok TTS API error after retries: {response.text}")
                    return TTSResult(
                        latency_ms=latency_ms,
                        success=False,
                        error_message=f"API Error {response.status_code}: {response.text}"
                    )
                    
                content_type = response.headers.get("Content-Type", "audio/mpeg")
                return TTSResult(
                    audio_bytes=response.content,
                    content_type=content_type,
                    latency_ms=latency_ms,
                    success=True
                )
                
        except httpx.TimeoutException:
            latency_ms = int((time.time() - start_time) * 1000)
            if retries > 0:
                logger.warning("TTS call timed out. Retrying...")
                await asyncio.sleep(0.5)
                return await self._synthesize_with_retry(text, retries=retries - 1)
                
            logger.warning(f"TTS call timed out after {latency_ms} ms")
            return TTSResult(
                latency_ms=latency_ms,
                success=False,
                error_message="TTS timeout"
            )
            
        except httpx.RequestError as e:
            if retries > 0:
                logger.warning(f"Network error calling TTS: {e}. Retrying after 500ms...")
                await asyncio.sleep(0.5)
                return await self._synthesize_with_retry(text, retries=retries - 1)
                
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"TTS network error after retries: {e}")
            return TTSResult(
                latency_ms=latency_ms,
                success=False,
                error_message=f"Network error: {str(e)}"
            )
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Unexpected error in TTS: {e}")
            return TTSResult(
                latency_ms=latency_ms,
                success=False,
                error_message=f"Unexpected error: {str(e)}"
            )
