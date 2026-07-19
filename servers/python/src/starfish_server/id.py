from __future__ import annotations

import secrets


class IDGenerator:
    def __init__(self) -> None:
        self._counter = 0

    def client_id(self) -> str:
        return "client_" + secrets.token_hex(4)

    def resume_token(self) -> str:
        return "rt_" + secrets.token_hex(8)

    def message_id(self) -> str:
        self._counter += 1
        return f"srv_{self._counter}"
