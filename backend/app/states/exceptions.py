class InvalidTransitionError(Exception):
    def __init__(self, current: str, attempted: str):
        self.current = current
        self.attempted = attempted
        super().__init__(f"Invalid state transition attempted from {current} to {attempted}")

class SessionNotFoundError(Exception):
    def __init__(self, session_id: str):
        self.session_id = session_id
        super().__init__(f"Session not found: {session_id}")
