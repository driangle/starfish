from __future__ import annotations

import asyncio
from typing import Callable

from .clock import Clock
from .connection import Connection
from .emitter import EventStream, Observable, Unsubscribe
from .events import Events
from .heartbeat import Heartbeat
from .types import (
    ConnectionState,
    EventFilter,
    StarfishClientOptions,
    StarfishFrame,
)


class StarfishClient:
    def __init__(self, options: StarfishClientOptions) -> None:
        self._connection = Connection(options)
        self._heartbeat = Heartbeat(self._connection)
        self.clock = Clock(self._connection)
        self._events = Events()

        self._connection.frames.subscribe(lambda frame: self._events.dispatch(frame))
        self._connection.state.subscribe(self._on_state_change)

    def _on_state_change(self, state: ConnectionState) -> None:
        if state == ConnectionState.CONNECTED:
            self._heartbeat.start()
        else:
            self._heartbeat.stop()

    @property
    def connection_state(self) -> Observable[ConnectionState]:
        return self._connection.state

    @property
    def client_id(self) -> str | None:
        return self._connection.client_id

    async def connect(self) -> None:
        await self._connection.connect()

    async def disconnect(self) -> None:
        self._heartbeat.stop()
        await self._connection.disconnect()

    def events(self, filter: EventFilter | None = None) -> EventStream[StarfishFrame]:
        return self._events.events(filter)

    def on(self, callback: Callable[[StarfishFrame], None]) -> Unsubscribe:
        return self._events.subscribe(callback)

    def at(self, server_time: float, callback: Callable[[], None]) -> asyncio.TimerHandle:
        return self.clock.at(server_time, callback)
