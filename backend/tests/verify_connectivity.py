import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to sys.path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.config import settings
from app.utils.logger import get_logger
from database.connection import test_connection
from app.stt.groq_stt import GroqSTT
from app.llm.groq_llm import GroqLLM
from app.tts.deepgram_tts import DeepgramTTS

logger = get_logger("verify_connectivity")

async def verify_all():
    logger.info("Starting connectivity verification (No Emojis)...")
    all_passed = True

    # 1. Test Database
    try:
        logger.info("Testing Database connection...")
        db_ok = await test_connection()
        if db_ok:
            logger.info("SUCCESS: Database connected successfully.")
        else:
            logger.error("FAILURE: Database connection failed.")
            all_passed = False
    except Exception as e:
        logger.error(f"FAILURE: Database exception: {e}")
        all_passed = False

    # 2. Test Groq LLM
    try:
        logger.info("Testing Groq LLM...")
        llm = GroqLLM()
        result = await llm.generate([{"role": "user", "content": "Say 'ready'"}], max_tokens=5)
        if result.success:
            logger.info(f"SUCCESS: Groq LLM is working. Response: {result.content.strip()}")
        else:
            logger.error(f"FAILURE: Groq LLM failed. {result.error_message}")
            all_passed = False
    except Exception as e:
        logger.error(f"FAILURE: Groq LLM exception: {e}")
        all_passed = False

    # 3. Test Deepgram TTS
    try:
        logger.info("Testing Deepgram TTS...")
        tts = DeepgramTTS()
        result = await tts.synthesize("Connectivity test.")
        if result.success:
            logger.info(f"SUCCESS: Deepgram TTS is working. Received {len(result.audio_bytes)} bytes.")
        else:
            logger.error(f"FAILURE: Deepgram TTS failed. {result.error_message}")
            all_passed = False
    except Exception as e:
        logger.error(f"FAILURE: Deepgram TTS exception: {e}")
        all_passed = False

    # 4. Test Groq STT
    try:
        logger.info("Testing Groq STT...")
        stt = GroqSTT()
        # Generate 0.5 seconds of silence (16kHz, 16-bit, mono)
        # 16000 samples * 0.5 sec = 8000 samples = 16000 bytes
        silence_data = b'\x00' * 16000
        # Simple WAV header for 16kHz, 16-bit, mono
        wav_header = b'RIFF\x24\x3e\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x3e\x00\x00'
        test_audio = wav_header + silence_data
        
        result = await stt.transcribe(test_audio)
        if result.success:
            logger.info("SUCCESS: Groq STT is working.")
        elif "Audio file is too short" in str(result.error_message):
             # Even if too short, if we got a 400 from Groq, the key is valid
             logger.info("SUCCESS: Groq STT key verified (API responded).")
        else:
            logger.error(f"FAILURE: Groq STT failed. {result.error_message}")
            all_passed = False
    except Exception as e:
        logger.error(f"FAILURE: Groq STT exception: {e}")
        all_passed = False

    if all_passed:
        logger.info("\n" + "="*40)
        logger.info("ALL SYSTEMS OPERATIONAL!")
        logger.info("="*40)
    else:
        logger.error("\n" + "="*40)
        logger.error("SOME SERVICES FAILED. CHECK LOGS.")
        logger.error("="*40)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(verify_all())
