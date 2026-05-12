import asyncio
from app.utils.logger import get_logger
from app.states.machine import State
from app.websocket.events import EventType

from app.stt.groq_stt import GroqSTT
from app.stt.processor import STTProcessor
from app.llm.groq_llm import GroqLLM
from app.llm.processor import ConversationProcessor
from app.prompts.builder import PromptBuilder
from app.tts.deepgram_tts import DeepgramTTS
from app.tts.streamer import TTSStreamer
from app.corrections.engine import GrammarCorrectionEngine
from app.interruptions.handler import InterruptionHandler

logger = get_logger(__name__)

class PipelineController:
    def __init__(self, session_id, websocket_handler, state_machine, session_manager):
        self.session_id = session_id
        self.websocket_handler = websocket_handler
        self.state_machine = state_machine
        self.session_manager = session_manager
        
        # Instantiate subcomponents
        self.groq_stt = GroqSTT()
        self.groq_llm = GroqLLM()
        self.deepgram_tts = DeepgramTTS()
        self.prompt_builder = PromptBuilder()
        
        self.grammar_engine = GrammarCorrectionEngine(
            groq_llm=self.groq_llm, 
            prompt_builder=self.prompt_builder
        )
        
        self.stt_processor = STTProcessor(
            groq_stt=self.groq_stt, 
            session_manager=self.session_manager, 
            state_machine=self.state_machine, 
            websocket_handler=self.websocket_handler,
            pipeline_controller=self
        )
        
        self.conversation_processor = ConversationProcessor(
            groq_llm=self.groq_llm, 
            grammar_engine=self.grammar_engine, 
            session_manager=self.session_manager, 
            prompt_builder=self.prompt_builder, 
            websocket_handler=self.websocket_handler
        )
        
        self.tts_streamer = TTSStreamer(
            deepgram_tts=self.deepgram_tts, 
            websocket_handler=self.websocket_handler, 
            state_machine=self.state_machine, 
            session_manager=self.session_manager
        )
        
        self.interrupt_handler = InterruptionHandler(
            state_machine=self.state_machine, 
            session_manager=self.session_manager, 
            websocket_handler=self.websocket_handler
        )
        
        self._audio_buffer = []

    async def on_audio_chunk(self, audio_bytes: bytes):
        if self.state_machine.is_in(State.LISTENING):
            self._audio_buffer.append(audio_bytes)
        else:
            logger.warning(f"[{self.session_id}] Discarding audio chunk. State is {self.state_machine.current_state.name}, not LISTENING.")

    async def on_speech_ended(self):
        if self.state_machine.is_in(State.LISTENING):
            if not self._audio_buffer:
                return
            combined_audio = b"".join(self._audio_buffer)
            self._audio_buffer.clear()
            await self.stt_processor.process_audio(self.session_id, combined_audio)

    async def on_transcript_received(self, session_id: str, transcript: str):
        if self.state_machine.is_in(State.THINKING):
            llm_task = asyncio.create_task(self.conversation_processor.process(session_id, transcript))
            self.interrupt_handler.register_llm_task(llm_task)
            
            try:
                response_text = await llm_task
                
                if response_text and self.state_machine.current_state in [State.THINKING, State.SPEAKING]:
                    tts_task = asyncio.create_task(self.tts_streamer.stream(session_id, response_text))
                    self.interrupt_handler.register_tts_task(tts_task)
                    await tts_task
            except asyncio.CancelledError:
                logger.info(f"[{session_id}] Transcript processing cancelled via interrupt")
            except Exception as e:
                logger.error(f"[{session_id}] Error in on_transcript_received: {e}")

    async def on_interrupt_detected(self):
        await self.interrupt_handler.on_interrupt_detected(self.session_id)

    async def on_audio_finished(self):
        if self.state_machine.is_in(State.SPEAKING):
            await self.state_machine.transition(State.LISTENING, "audio playback finished")
            await self.session_manager.update_state(self.session_id, State.LISTENING.name)
            await self.websocket_handler.send_event(EventType.STATE_CHANGE.value, {"state": State.LISTENING.name})

    async def cleanup(self):
        await self.interrupt_handler.reset()
        self._audio_buffer.clear()
