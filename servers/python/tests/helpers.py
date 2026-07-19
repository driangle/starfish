from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class MockWebSocket:
    """Fake WebSocket that captures sent messages."""

    def __init__(self) -> None:
        self.sent: list[str] = []
        self.closed = False
        self.send = AsyncMock(side_effect=self._capture_send)
        self.close = AsyncMock()

    async def _capture_send(self, data: str) -> None:
        self.sent.append(data)


def make_frame(
    resource: str,
    method: str,
    kind: str = "request",
    payload: dict[str, Any] | None = None,
    **header_kwargs: Any,
) -> dict[str, Any]:
    """Helper to build test frames quickly."""
    header: dict[str, Any] = {
        "id": "test_msg_1",
        "resource": resource,
        "method": method,
        "kind": kind,
        **header_kwargs,
    }
    frame: dict[str, Any] = {"header": header}
    if payload is not None:
        frame["payload"] = payload
    return frame
