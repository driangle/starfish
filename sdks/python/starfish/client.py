from __future__ import annotations

import asyncio
from typing import Any, Callable

from .clock import Clock
from .connection import Connection
from .data import Data, DataResult, SaveOptions
from .emitter import EventStream, Observable, Unsubscribe
from .events import Events
from .heartbeat import Heartbeat
from .messaging import Messaging
from .pool import Pool, PoolEnteredResult, PoolEnterOptions, PoolMatchResult, PoolMember
from .presence import Presence
from .session import ClientInfo, JoinOptions, Session
from .topics import Topics
from .types import (
    ConnectionState,
    EventFilter,
    FrameOptions,
    StarfishClientOptions,
    StarfishFrame,
)


class StarfishClient:
    def __init__(self, options: StarfishClientOptions) -> None:
        self._connection = Connection(options)
        self._heartbeat = Heartbeat(self._connection)
        self.clock = Clock(self._connection)
        self._events = Events()
        self._session = Session(self._connection)
        self._topics = Topics(self._connection, self._session)
        self._messaging = Messaging(self._connection, self._session)
        self._presence = Presence(self._connection, self._session)
        self._data = Data(self._connection, self._session)
        self._pool = Pool(self._connection)

        self._connection.frames.subscribe(self._handle_frame)
        self._connection.state.subscribe(self._on_state_change)

    def _on_state_change(self, state: ConnectionState) -> None:
        if state == ConnectionState.CONNECTED:
            self._heartbeat.start()
        else:
            self._heartbeat.stop()

    def _handle_frame(self, frame: StarfishFrame) -> None:
        self._session.handle_frame(frame)
        self._topics.handle_frame(frame)
        self._presence.handle_frame(frame)
        self._data.handle_frame(frame)
        self._pool.handle_frame(frame)
        self._events.dispatch(frame)

    @property
    def connection_state(self) -> Observable[ConnectionState]:
        return self._connection.state

    @property
    def client_id(self) -> str | None:
        return self._connection.client_id

    @property
    def session(self) -> Session:
        return self._session

    @property
    def clients(self) -> Observable[list[ClientInfo]]:
        return self._session.clients

    @property
    def peers(self) -> Observable[list[ClientInfo]]:
        return self._session.peers

    async def connect(self) -> None:
        await self._connection.connect()

    async def disconnect(self) -> None:
        self._heartbeat.stop()
        await self._connection.disconnect()

    # --- Session ---

    async def join(self, session: str, options: JoinOptions | None = None) -> StarfishFrame:
        return await self._session.join(session, options)

    async def leave(self) -> None:
        await self._session.leave()

    # --- Topics ---

    async def subscribe(
        self, topic: str, callback: Callable[[StarfishFrame], None] | None = None
    ) -> StarfishFrame:
        return await self._topics.subscribe(topic, callback)

    async def unsubscribe(self, topic: str) -> None:
        await self._topics.unsubscribe(topic)

    async def publish(self, topic: str, payload: Any, options: FrameOptions | None = None) -> None:
        await self._topics.publish(topic, payload, options)

    def topic_stream(self, topic: str) -> EventStream[StarfishFrame]:
        return self._topics.topic_stream(topic)

    # --- Messaging ---

    async def send(
        self, to: str | list[str], payload: Any, options: FrameOptions | None = None
    ) -> None:
        await self._messaging.send(to, payload, options)

    async def broadcast(
        self, payload: Any, *, include_self: bool = False, options: FrameOptions | None = None
    ) -> None:
        await self._messaging.broadcast(payload, include_self=include_self, options=options)

    # --- Presence ---

    @property
    def presence(self) -> Observable[dict[Any, Any]]:
        return self._presence.presence

    def presence_set(self, payload: Any) -> None:
        self._presence.set(payload)

    async def presence_set_async(self, payload: Any) -> None:
        await self._presence.set_async(payload)

    # --- Data ---

    @property
    def data_changed(self) -> EventStream[DataResult]:
        return self._data.changed

    def data_key_stream(self, key: str) -> EventStream[DataResult]:
        return self._data.key_stream(key)

    async def save(self, options: SaveOptions) -> DataResult:
        return await self._data.save(options)

    async def get(self, key: str, scope: str = "session") -> DataResult:
        return await self._data.get(key, scope)  # type: ignore[arg-type]

    # --- Pool ---

    async def pool_enter(self, options: PoolEnterOptions) -> PoolEnteredResult:
        return await self._pool.enter(options)

    async def pool_leave(self, pool: str) -> None:
        await self._pool.leave(pool)

    async def pool_claim(self, pool: str, target: str) -> None:
        await self._pool.claim(pool, target)

    async def pool_accept(self, pool: str, from_: str) -> None:
        await self._pool.accept(pool, from_)

    async def pool_reject(self, pool: str, from_: str) -> None:
        await self._pool.reject(pool, from_)

    async def pool_assign(self, pool: str, groups: list[list[str]]) -> StarfishFrame:
        return await self._pool.assign(pool, groups)

    def pool_members(self, pool: str) -> Observable[list[PoolMember]]:
        return self._pool.members(pool)

    @property
    def pool_matched(self) -> EventStream[PoolMatchResult]:
        return self._pool.matched

    # --- Events ---

    def events(self, filter: EventFilter | None = None) -> EventStream[StarfishFrame]:
        return self._events.events(filter)

    def on(self, callback: Callable[[StarfishFrame], None]) -> Unsubscribe:
        return self._events.subscribe(callback)

    def at(self, server_time: float, callback: Callable[[], None]) -> asyncio.TimerHandle:
        return self.clock.at(server_time, callback)
