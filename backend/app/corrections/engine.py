import re
from typing import Optional
from app.utils.logger import get_logger
from app.corrections.schemas import CorrectionResult

logger = get_logger(__name__)

class GrammarCorrectionEngine:
    def __init__(self, groq_llm, prompt_builder):
        self.groq_llm = groq_llm
        self.prompt_builder = prompt_builder

    async def check(self, user_input: str, session_id: str) -> CorrectionResult:
        try:
            messages = self.prompt_builder.build_grammar_check_messages(user_input)
            
            response = await self.groq_llm.generate(messages, max_tokens=100)
            
            if not response.success:
                logger.error(f"[{session_id}] Grammar check LLM failure: {response.error_message}")
                return CorrectionResult(
                    has_correction=False,
                    original=user_input,
                    latency_ms=response.latency_ms
                )
                
            content = response.content.strip()
            
            if "NO_CORRECTION_NEEDED" in content:
                return CorrectionResult(
                    has_correction=False,
                    original=user_input,
                    latency_ms=response.latency_ms
                )
                
            corrected_sentence = self._parse_correction(content)
            
            if not corrected_sentence:
                logger.warning(f"[{session_id}] Grammar correction parsing failed. Using full response.")
                
            return CorrectionResult(
                has_correction=True,
                original=user_input,
                corrected=corrected_sentence,
                friendly_message=content,
                latency_ms=response.latency_ms
            )

        except Exception as e:
            logger.error(f"[{session_id}] Exception in grammar correction: {e}")
            return CorrectionResult(has_correction=False, original=user_input, latency_ms=0)

    def _parse_correction(self, text: str) -> Optional[str]:
        match = re.search(r"A more natural way to say that is:\s*['\"]([^'\"]+)['\"]", text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
            
        match = re.search(r"['\"]([^'\"]+)['\"]", text)
        if match and len(match.group(1)) > 3:
            return match.group(1).strip()
                
        return None
