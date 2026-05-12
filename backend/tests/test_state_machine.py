import pytest
import uuid
import asyncio
from app.states.machine import ConversationStateMachine, State
from app.states.exceptions import InvalidTransitionError

@pytest.fixture
def machine():
    return ConversationStateMachine(session_id=uuid.uuid4())

@pytest.mark.asyncio
async def test_initial_state(machine):
    assert machine.current_state == State.IDLE
    assert machine.is_in(State.IDLE)

@pytest.mark.asyncio
async def test_valid_golden_path_transitions(machine):
    # IDLE -> LISTENING -> TRANSCRIBING -> THINKING -> SPEAKING -> LISTENING
    await machine.transition(State.LISTENING, "user connects")
    assert machine.current_state == State.LISTENING

    await machine.transition(State.TRANSCRIBING, "VAD detects speech end")
    assert machine.current_state == State.TRANSCRIBING

    await machine.transition(State.THINKING, "STT complete")
    assert machine.current_state == State.THINKING

    await machine.transition(State.SPEAKING, "response ready")
    assert machine.current_state == State.SPEAKING

    await machine.transition(State.LISTENING, "audio ends")
    assert machine.current_state == State.LISTENING

@pytest.mark.asyncio
async def test_interruption_transition(machine):
    # Setup state to SPEAKING
    machine._current_state = State.SPEAKING
    
    await machine.transition(State.INTERRUPTED, "user barge-in detected")
    assert machine.current_state == State.INTERRUPTED

    await machine.transition(State.LISTENING, "cleanup done")
    assert machine.current_state == State.LISTENING

@pytest.mark.asyncio
async def test_error_from_all_states(machine):
    states_to_test = [
        State.IDLE, State.LISTENING, State.TRANSCRIBING, 
        State.THINKING, State.SPEAKING, State.INTERRUPTED
    ]
    
    for state in states_to_test:
        machine._current_state = state
        await machine.transition(State.ERROR, "unrecoverable failure")
        assert machine.current_state == State.ERROR
        
        # Test recovery from ERROR
        if state == State.IDLE:
            await machine.transition(State.IDLE, "recovery")
        else:
            await machine.transition(State.LISTENING, "recovery with session")

@pytest.mark.asyncio
async def test_invalid_transition_raises_error(machine):
    assert machine.current_state == State.IDLE
    
    with pytest.raises(InvalidTransitionError) as exc_info:
        await machine.transition(State.THINKING, "skipping steps")
        
    assert exc_info.value.current == "IDLE"
    assert exc_info.value.attempted == "THINKING"

@pytest.mark.asyncio
async def test_reset_method(machine):
    machine._current_state = State.SPEAKING
    await machine.reset()
    assert machine.current_state == State.IDLE
