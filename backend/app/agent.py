import asyncio
import os
import re
import json
from dotenv import load_dotenv
load_dotenv()

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm, voice
from livekit.plugins import openai, deepgram, silero
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

async def entrypoint(ctx: JobContext):
    logger.info("Connecting to LiveKit room...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    logger.info("Setting up LiveKit Voice Pipeline Agent...")
    
    # System prompt
    system_prompt = (
        "You are FluentFlow AI, a friendly and conversational English tutor. "
        "Your goal is to help the user practice English. "
        "1. Keep your responses to 2-3 sentences. "
        "2. If the user makes a grammar mistake, gently correct it naturally in your speech. "
        "3. IMPORTANT: If you correct a mistake, also prefix your internal thought with [CORRECTION: original -> corrected] "
        "so the system can display it visually. Example: [CORRECTION: I goed -> I went] Oh, I see! By the way, you should say 'I went'. What else did you do?"
    )

    # In 1.x, we use add_message instead of append
    initial_ctx = llm.ChatContext()
    initial_ctx.add_message(role="system", content=system_prompt)

    # Groq STT
    stt = openai.STT(
        base_url="https://api.groq.com/openai/v1",
        api_key=settings.groq_api_key,
        model="whisper-large-v3"
    )

    # Groq LLM
    llm_model = openai.LLM(
        base_url="https://api.groq.com/openai/v1",
        api_key=settings.groq_api_key,
        model=settings.groq_model
    )

    # Deepgram TTS
    tts = deepgram.TTS(
        api_key=settings.deepgram_api_key,
        model="aura-asteria-en"
    )

    vad = silero.VAD.load()

    # In 1.x, AgentSession orchestrates the components
    session = voice.AgentSession(
        stt=stt,
        llm=llm_model,
        tts=tts,
        vad=vad
    )

    # Agent defines the instructions and state
    agent = voice.Agent(
        instructions=system_prompt,
        chat_ctx=initial_ctx
    )

    # Add a callback to intercept transcriptions for grammar checks
    @session.on("conversation_item_added")
    def on_conversation_item_added(event: voice.ConversationItemAddedEvent):
        msg = event.item
        # Ensure it's a message and from the assistant
        if not isinstance(msg, llm.ChatMessage) or msg.role != "assistant":
            return
            
        # Extract text from content (which is a list of strings in 1.x)
        text = ""
        if isinstance(msg.content, list):
            text = " ".join([str(c) for c in msg.content])
        else:
            text = str(msg.content)
            
        if "[CORRECTION:" in text:
            match = re.search(r"\[CORRECTION: (.*?) -> (.*?)\]", text)
            if match:
                original, corrected = match.groups()
                logger.info(f"Detected correction: {original} -> {corrected}")
                
                # Send JSON matching the new schema
                event = {
                    "type": "grammar_correction",
                    "payload": {
                        "original": original,
                        "corrected": corrected,
                        "fullPhrase": f"{corrected} not {original}",
                        "position": "inline"
                    }
                }
                asyncio.create_task(ctx.room.local_participant.publish_data(
                    payload=json.dumps(event).encode(),
                    reliable=True
                ))

    # Start the session
    await session.start(room=ctx.room, agent=agent)
    logger.info("Agent started and listening!")

    await asyncio.sleep(1)
    await session.say("Hi there! I'm FluentFlow AI. What would you like to practice today?", allow_interruptions=True)

if __name__ == "__main__":
    # You must run this via `python -m app.agent start`
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

