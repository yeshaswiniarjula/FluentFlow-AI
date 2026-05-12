import time
import httpx
import asyncio
from typing import List, Dict, Any
from app.utils.config import settings
from app.utils.logger import get_logger
from app.llm.schemas import LLMResponse

logger = get_logger(__name__)

class GroqLLM:
    def __init__(self):
        self.api_key = settings.groq_api_key
        self.model = settings.groq_model
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate(self, messages: List[Dict[str, Any]], max_tokens: int = 150) -> LLMResponse:
        return await self._generate_with_retry(messages, max_tokens, retries=1)

    async def _generate_with_retry(self, messages: List[Dict[str, Any]], max_tokens: int, retries: int) -> LLMResponse:
        start_time = time.time()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": max_tokens
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                latency_ms = int((time.time() - start_time) * 1000)
                logger.info(f"Groq LLM call completed in {latency_ms} ms")

                if response.status_code == 200:
                    resp_json = response.json()
                    content = resp_json["choices"][0]["message"]["content"]
                    tokens_used = resp_json.get("usage", {}).get("total_tokens", 0)
                    return LLMResponse(
                        content=content,
                        tokens_used=tokens_used,
                        latency_ms=latency_ms,
                        success=True
                    )
                elif response.status_code == 429:
                    if retries > 0:
                        logger.warning("Groq LLM rate limited (429). Retrying after 1 second...")
                        await asyncio.sleep(1.0)
                        return await self._generate_with_retry(messages, max_tokens, retries=retries - 1)
                    else:
                        logger.error("Groq LLM rate limited. Retries exhausted.")
                        return LLMResponse(latency_ms=latency_ms, success=False, error_message="Rate limit exceeded")
                else:
                    logger.error(f"Groq LLM error ({response.status_code}): {response.text}")
                    return LLMResponse(latency_ms=latency_ms, success=False, error_message=f"API Error {response.status_code}")

        except httpx.TimeoutException:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"Groq LLM call timed out after {latency_ms} ms")
            return LLMResponse(latency_ms=latency_ms, success=False, error_message="LLM timeout")
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Unexpected error in Groq LLM: {e}")
            return LLMResponse(latency_ms=latency_ms, success=False, error_message=str(e))
