from __future__ import annotations

import asyncio
import json
from typing import TYPE_CHECKING, Any

from .errors import ERR_PROTOCOL_INVALID_FRAME, create_error_frame
from .limits import MAX_SEND_QUEUE
from .types import StarfishFrame

if TYPE_CHECKING:
    from websockets import ServerConnection

    from .server import StarfishServer


class ClientInfo:
    __slots__ = ("id", "name", "role", "meta")

    def __init__(self, id: str, name: str = "", role: str = "", meta: Any = None) -> None:
        self.id = id
        self.name = name
        self.role = role
        self.meta = meta

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"id": self.id}
        if self.name:
            d["name"] = self.name
        if self.role:
            d["role"] = self.role
        if self.meta is not None:
            d["meta"] = self.meta
        return d


def validate_frame(raw: str) -> tuple[StarfishFrame | None, str, str]:
    """Returns (frame, error_code, reply_to). If frame is None, error_code is set."""
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None, ERR_PROTOCOL_INVALID_FRAME, ""

    if not isinstance(parsed, dict):
        return None, ERR_PROTOCOL_INVALID_FRAME, ""

    header = parsed.get("header")
    if not isinstance(header, dict):
        return None, ERR_PROTOCOL_INVALID_FRAME, ""

    msg_id = header.get("id", "")
    if not isinstance(msg_id, str):
        msg_id = ""

    if (
        not msg_id
        or not isinstance(header.get("resource"), str)
        or not header.get("resource")
        or not isinstance(header.get("method"), str)
        or not header.get("method")
        or not isinstance(header.get("kind"), str)
        or not header.get("kind")
    ):
        return None, ERR_PROTOCOL_INVALID_FRAME, msg_id

    return parsed, "", ""


class Client:
    def __init__(self, hub: StarfishServer, ws: ServerConnection) -> None:
        self._hub = hub
        self._ws = ws
        self._send_queue: asyncio.Queue[str] = asyncio.Queue(maxsize=MAX_SEND_QUEUE)
        self._closed = False
        self._writer_task: asyncio.Task[None] | None = None

        self.id = ""
        self.name = ""
        self.role = ""
        self.meta: Any = None
        self.rtc_capable = False
        self.authenticated = False
        self.last_activity = _now_ms()
        self.sessions: set[str] = set()
        self.pools: set[str] = set()
        self.topics: dict[str, set[str]] = {}

    async def run(self) -> None:
        self._writer_task = asyncio.create_task(self._writer())
        try:
            async for message in self._ws:
                if isinstance(message, bytes):
                    message = message.decode("utf-8", errors="replace")
                self._on_message(message)
        except Exception:
            pass
        finally:
            self._on_close()
            self._writer_task.cancel()
            try:
                await self._writer_task
            except asyncio.CancelledError:
                pass

    def send_frame(self, frame: StarfishFrame) -> None:
        if self._closed:
            return
        if self.id and not frame.get("header", {}).get("from"):
            frame.setdefault("header", {})["from"] = self.id
        data = json.dumps(frame)
        try:
            self._send_queue.put_nowait(data)
        except asyncio.QueueFull:
            pass

    def info(self) -> ClientInfo:
        return ClientInfo(id=self.id, name=self.name, role=self.role, meta=self.meta)

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        asyncio.ensure_future(self._ws.close())

    async def _writer(self) -> None:
        try:
            while True:
                msg = await self._send_queue.get()
                try:
                    await self._ws.send(msg)
                except Exception:
                    break
        except asyncio.CancelledError:
            pass

    def _on_message(self, data: str) -> None:
        self.last_activity = _now_ms()

        frame, error_code, reply_to = validate_frame(data)
        if frame is None:
            self.send_frame(create_error_frame(self._hub.id_gen, reply_to, error_code))
            return

        self._hub.handler.dispatch(self, frame)

    def _on_close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._hub.handle_client_disconnect(self)
        self._hub.remove_client(self)


def _now_ms() -> int:
    import time
    return int(time.time() * 1000)
