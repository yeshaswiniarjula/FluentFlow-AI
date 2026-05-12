import uuid
from enum import Enum, auto
from app.utils.logger import get_logger
from app.states.exceptions import InvalidTransitionError

logger = get_logger(__name__)

class State(Enum):
    IDLE = auto()
    LISTENING = auto()
    TRANSCRIBING = auto()
    THINKING = auto()
    SPEAKING = auto()
    INTERRUPTED = auto()
    ERROR = auto()

# Define allowed transitions as per requirements
VALID_TRANSITIONS = {
    State.IDLE: {State.LISTENING, State.ERROR},
    State.LISTENING: {State.TRANSCRIBING, State.ERROR},
    State.TRANSCRIBING: {State.THINKING, State.ERROR},
    State.THINKING: {State.SPEAKING, State.ERROR},
    State.SPEAKING: {State.LISTENING, State.INTERRUPTED, State.ERROR},
    State.INTERRUPTED: {State.LISTENING, State.ERROR},
    State.ERROR: {State.IDLE, State.LISTENING}
}

class ConversationStateMachine:
    def __init__(self, session_id: str | uuid.UUID):
        self.session_id = str(session_id)
        self._current_state = State.IDLE
        logger.info(f"[{self.session_id}] StateMachine initialized in state {State.IDLE.name}")

    @property
    def current_state(self) -> State:
        return self._current_state

    def is_in(self, state: State) -> bool:
        return self._current_state == state

    async def transition(self, new_state: State, reason: str = "") -> None:
        if new_state not in VALID_TRANSITIONS[self._current_state]:
            logger.error(f"[{self.session_id}] Invalid transition from {self._current_state.name} to {new_state.name}")
            raise InvalidTransitionError(self._current_state.name, new_state.name)
        
        old_state = self._current_state
        self._current_state = new_state
        logger.info(f"[{self.session_id}] TRANSITION: {old_state.name} -> {new_state.name} | Reason: {reason}")

    async def reset(self) -> None:
        old_state = self._current_state
        self._current_state = State.IDLE
        logger.info(f"[{self.session_id}] RESET: {old_state.name} -> {State.IDLE.name} | Reason: reset called")
