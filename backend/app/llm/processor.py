import asyncio
from typing import Optional
from app.utils.logger import get_logger
from app.websocket.events import EventType
from app.states.machine import State
from app.llm.schemas import LLMResponse
from app.corrections.schemas import CorrectionResult

logger = get_logger(__name__)

class ConversationProcessor:
    def __init__(self, groq_llm, grammar_engine, session_manager, prompt_builder, websocket_handler):
        self.groq_llm = groq_llm
        self.grammar_engine = grammar_engine
        self.session_manager = session_manager
        self.prompt_builder = prompt_builder
        self.websocket_handler = websocket_handler

    async def process(self, session_id: str, transcript: str) -> Optional[str]:
        try:
            # 1. Fetch conversation history from session_manager
            conversation_history = await self.session_manager.get_conversation_history(session_id)
            
            # 2. Append user message to DB
            await self.session_manager.append_message(session_id, "user", transcript)
            
            # 3. Build conversation messages using prompt_builder
            messages = self.prompt_builder.build_conversation_messages(conversation_history, transcript)
            
            # 4. Start TWO async tasks concurrently
            task_a = self.groq_llm.generate(messages)
            task_b = self.grammar_engine.check(transcript, session_id)
            
            # 5. Wait for both with return_exceptions=True
            results = await asyncio.gather(task_a, task_b, return_exceptions=True)
            llm_result = results[0]
            grammar_result = results[1]
            
            # 8. Transition state: THINKING -> SPEAKING (before TTS starts)
            await self.websocket_handler.state_machine.transition(State.SPEAKING, "Response ready")
            await self.session_manager.update_state(session_id, State.SPEAKING.name)
            
            # 6. Handle Task A result
            response_text = ""
            if isinstance(llm_result, Exception) or not getattr(llm_result, "success", False):
                if isinstance(llm_result, Exception):
                    logger.error(f"[{session_id}] LLM Task exception: {llm_result}")
                else:
                    logger.error(f"[{session_id}] LLM Generation failed: {llm_result.error_message}")
                    
                response_text = "Could you say that again?"
                await self.websocket_handler.send_event(EventType.AI_RESPONSE.value, {"text": response_text})
            else:
                response_text = llm_result.content
                await self.session_manager.append_message(session_id, "assistant", response_text)
                await self.websocket_handler.send_event(EventType.AI_RESPONSE.value, {"text": response_text})
                
            # 7. Handle Task B result
            if not isinstance(grammar_result, Exception) and getattr(grammar_result, "has_correction", False):
                await self.websocket_handler.send_event(
                    EventType.GRAMMAR_CORRECTION.value,
                    {
                        "original": grammar_result.original,
                        "corrected": grammar_result.corrected,
                        "message": grammar_result.friendly_message
                    }
                )
            elif isinstance(grammar_result, Exception):
                logger.warning(f"[{session_id}] Grammar task exception: {grammar_result}")
                
            # 9. Return AI response text for TTS
            return response_text
            
        except asyncio.CancelledError:
            logger.info(f"ConversationProcessor cancelled for session {session_id}")
            raise
        except Exception as e:
            logger.error(f"[{session_id}] Unexpected error in ConversationProcessor: {e}")
            return None
