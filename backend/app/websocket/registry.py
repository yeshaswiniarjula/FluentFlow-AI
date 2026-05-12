from typing import Set, List, Any

class WebSocketRegistry:
    def __init__(self):
        self._handlers: Set[Any] = set()

    def register(self, handler: Any):
        self._handlers.add(handler)

    def unregister(self, handler: Any):
        self._handlers.discard(handler)

    def get_all(self) -> List[Any]:
        return list(self._handlers)

_registry = WebSocketRegistry()

def get_registry() -> WebSocketRegistry:
    return _registry
