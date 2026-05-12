import time
import httpx
import asyncio
from app.utils.config import settings
from app.utils.logger import get_logger
from app.tts.schemas import TTSResult

logger = get_logger(__name__)

class DeepgramTTS:
    def __init__(self):
        self.api_key = settings.deepgram_api_key
        # Aura is Deepgram's high-speed text-to-speech model
        self.api_url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"

    async def synthesize(self, text: str) -> TTSResult:
        return await self._synthesize_with_retry(text, retries=1)

    async def _synthesize_with_retry(self, text: str, retries: int) -> TTSResult:
        start_time = time.time()
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "text": text
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url, 
                    headers=headers, 
                    json=payload
                )
                
                latency_ms = int((time.time() - start_time) * 1000)
                logger.info(f"Deepgram TTS call completed in {latency_ms} ms")
                
                if response.status_code >= 400:
                    if retries > 0:
                        logger.warning(f"Deepgram TTS API error {response.status_code}. Retrying...")
                        await asyncio.sleep(0.5)
                        return await self._synthesize_with_retry(text, retries=retries - 1)
                        
                    logger.error(f"Deepgram TTS API error after retries: {response.text}")
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
                
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Unexpected error in Deepgram TTS: {e}")
            return TTSResult(
                latency_ms=latency_ms,
                success=False,
                error_message=f"Unexpected error: {str(e)}"
            )
