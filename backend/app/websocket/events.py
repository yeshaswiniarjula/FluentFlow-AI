from enum import Enum

class EventType(str, Enum):
    CONNECTED = "connected"
    TRANSCRIPT = "transcript"
    AI_RESPONSE = "ai_response"
    GRAMMAR_CORRECTION = "grammar_correction"
    STATE_CHANGE = "state_change"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"
    INTERRUPTED = "interrupted"
    AUDIO_CHUNK = "audio_chunk"
