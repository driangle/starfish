from __future__ import annotations

import asyncio
import json
import random
import time
from typing import Any

import websockets

from .emitter import EventStream, Observable
from .id import next_id
from .pending import PendingRequests
from .types import (
    ConnectionState,
    ReconnectOptions,
    StarfishClientOptions,
    StarfishFrame,
    StarfishHeader,
    frame_from_dict,
    frame_to_dict,
)

DEFAULT_REQUEST_TIMEOUT = 10_000

RECONNECT_DEFAULTS = ReconnectOptions()


class Connection:
    def __init__(self, options: StarfishClientOptions) -> None:
        self._options = options
        self._ws: Any = None
        self._pending = PendingRequests()
        self._reconnect_attempt = 0
        self._reconnect_task: asyncio.Task[None] | None = None
        self._receive_task: asyncio.Task[None] | None = None
        self._intentional_close = False

        self.client_id: str | None = None
        self.resume_token: str | None = None
        self.heartbeat_interval: int = 15_000
        self.server_time: int | None = None

        self.state: Observable[ConnectionState] = Observable(ConnectionState.DISCONNECTED)
        self.frames: EventStream[StarfishFrame] = EventStream()

    async def connect(self) -> StarfishFrame:
        self._intentional_close = False
        self.state.set(ConnectionState.CONNECTING)

        try:
            if self._options.ws_factory:
                self._ws = self._options.ws_factory(self._options.server)
            else:
                self._ws = await websockets.connect(self._options.server)
        except Exception:
            self.state.set(ConnectionState.DISCONNECTED)
            raise

        self._receive_task = asyncio.create_task(self._receive_loop())

        try:
            welcome = await self._do_handshake()
        except Exception:
            await self._close_ws()
            self.state.set(ConnectionState.DISCONNECTED)
            raise

        return welcome

    async def disconnect(self) -> None:
        self._intentional_close = True
        self._cancel_reconnect()
        self._pending.reject_all(Exception("Client disconnected"))

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None

        await self._close_ws()
        self.state.set(ConnectionState.DISCONNECTED)

    async def send(self, frame: StarfishFrame) -> None:
        if self._ws is None:
            raise RuntimeError("Not connected")
        data = json.dumps(frame_to_dict(frame))
        await self._ws.send(data)

    async def send_and_wait(
        self, frame: StarfishFrame, timeout: int = DEFAULT_REQUEST_TIMEOUT
    ) -> StarfishFrame:
        future = self._pending.add(frame.header.id, timeout)
        await self.send(frame)
        return await future

    async def _receive_loop(self) -> None:
        try:
            async for message in self._ws:
                data = json.loads(message)
                frame = frame_from_dict(data)
                if not self._pending.resolve(frame):
                    self.frames.emit(frame)
        except websockets.ConnectionClosed:
            pass
        except asyncio.CancelledError:
            return
        finally:
            if not asyncio.current_task().cancelled():
                self._handle_close()

    async def _do_handshake(self) -> StarfishFrame:
        if self.resume_token:
            payload: dict[str, Any] = {"resumeToken": self.resume_token}
        else:
            client = self._options.client
            payload = {
                "versions": [2],
                "client": {
                    "name": client.name if client else "starfish-client",
                    "role": client.role if client else "default",
                    "meta": client.meta if client else {},
                },
                "auth": (
                    {"type": self._options.auth.type, "token": self._options.auth.token}
                    if self._options.auth
                    else {"type": "none"}
                ),
            }

        ts = int(time.time() * 1000)
        hello = StarfishFrame(
            header=StarfishHeader(
                v=2,
                id=next_id("hello"),
                resource="client",
                method="hello",
                kind="request",
                ts=ts,
            ),
            payload=payload,
        )
        welcome = await self.send_and_wait(hello)

        welcome_payload = welcome.payload or {}
        self.client_id = welcome_payload.get("clientId")
        self.resume_token = welcome_payload.get("resumeToken")
        self.heartbeat_interval = welcome_payload.get("heartbeatInterval", self.heartbeat_interval)
        self.server_time = welcome_payload.get("serverTime")
        self._reconnect_attempt = 0
        self.state.set(ConnectionState.CONNECTED)

        return welcome

    def _handle_close(self) -> None:
        self._ws = None

        if self._intentional_close:
            self.state.set(ConnectionState.DISCONNECTED)
            return

        self._pending.reject_all(Exception("Connection lost"))
        self._schedule_reconnect()

    def _schedule_reconnect(self) -> None:
        opts = self._options.reconnect or RECONNECT_DEFAULTS

        if not opts.enabled or self._reconnect_attempt >= opts.max_retries:
            self.state.set(ConnectionState.DISCONNECTED)
            return

        self.state.set(ConnectionState.RECONNECTING)

        delay = min(
            opts.base_delay * (2**self._reconnect_attempt) + random.random() * opts.base_delay,
            opts.max_delay,
        )
        self._reconnect_attempt += 1
        self._reconnect_task = asyncio.create_task(self._reconnect_after(delay / 1000))

    async def _reconnect_after(self, delay_seconds: float) -> None:
        await asyncio.sleep(delay_seconds)
        try:
            await self.connect()
        except Exception:
            pass  # _handle_close will schedule the next attempt

    def _cancel_reconnect(self) -> None:
        if self._reconnect_task:
            self._reconnect_task.cancel()
            self._reconnect_task = None

    async def _close_ws(self) -> None:
        if self._ws:
            try:
                await self._ws.close(1000, "client disconnect")
            except Exception:
                pass
            self._ws = None
