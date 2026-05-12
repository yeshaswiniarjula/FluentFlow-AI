import asyncio
import io
import wave
import time
import httpx
from app.utils.config import settings
from app.utils.logger import get_logger
from app.stt.schemas import TranscriptionResult

logger = get_logger(__name__)

class GroqSTT:
    def __init__(self):
        self.api_key = settings.groq_api_key
        self.api_url = "https://api.groq.com/openai/v1/audio/transcriptions"

    def _wrap_with_wav_header(self, pcm_bytes: bytes, sample_rate: int = 16000, channels: int = 1, bit_depth: int = 16) -> bytes:
        """Wrap raw PCM bytes with a standard WAV header."""
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(channels)
            wav.setsampwidth(bit_depth // 8)
            wav.setframerate(sample_rate)
            wav.writeframes(pcm_bytes)
        return buffer.getvalue()
    
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> TranscriptionResult:
        return await self._transcribe_with_retry(audio_bytes, language, retries=1)

    async def _transcribe_with_retry(self, audio_bytes: bytes, language: str, retries: int) -> TranscriptionResult:
        start_time = time.time()
        headers = {"Authorization": f"Bearer {self.api_key}"}
        # Groq expects a valid media file (e.g., WAV), not raw PCM
        wav_audio = self._wrap_with_wav_header(audio_bytes)
        files = {"file": ("audio.wav", wav_audio, "audio/wav")}
        data = {
            "model": "whisper-large-v3", 
            "language": language,
            "response_format": "json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url, 
                    headers=headers, 
                    data=data, 
                    files=files
                )
                
                duration_ms = int((time.time() - start_time) * 1000)
                logger.info(f"Groq STT call completed in {duration_ms} ms")
                
                if response.status_code >= 400:
                    logger.error(f"Groq STT API error {response.status_code}: {response.text}")
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
            logger.warning(f"Groq STT call timed out after {duration_ms} ms")
            return TranscriptionResult(
                duration_ms=duration_ms,
                success=False,
                error_message="STT timeout"
            )
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Unexpected error in Groq STT: {e}")
            return TranscriptionResult(
                duration_ms=duration_ms,
                success=False,
                error_message=f"Unexpected error: {str(e)}"
            )
