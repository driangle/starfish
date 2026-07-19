from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from .client import Client
from .pool_broadcast import broadcast_pool_member_left
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


@dataclass
class ResumeEntry:
    client_id: str
    token: str
    name: str
    role: str
    meta: Any
    rtc_capable: bool
    sessions: set[str]
    pools: set[str]
    topics: dict[str, set[str]]
    presence: dict[str, Any]
    timer_handle: asyncio.TimerHandle | None = None


class ResumeRegistry:
    def __init__(self, hub: StarfishServer) -> None:
        self._hub = hub
        self._by_token: dict[str, ResumeEntry] = {}
        self._by_client: dict[str, str] = {}

    def register_token(self, client: Client, token: str) -> None:
        prev = self._by_client.get(client.id)
        if prev:
            entry = self._by_token.get(prev)
            if entry and entry.timer_handle:
                entry.timer_handle.cancel()
            self._by_token.pop(prev, None)
        self._by_client[client.id] = token

    def store(self, client: Client) -> None:
        token = self._by_client.get(client.id)
        if not token:
            self._expire_client(client)
            return

        topics: dict[str, set[str]] = {}
        for sess, topic_set in client.topics.items():
            topics[sess] = set(topic_set)

        presence: dict[str, Any] = {}
        for sess_name in client.sessions:
            sess = self._hub.get_session(sess_name)
            if sess:
                data = sess.get_presence(client.id)
                if data is not None:
                    presence[sess_name] = data

        timeout_sec = self._hub.config.resume_timeout_ms / 1000
        try:
            loop = asyncio.get_running_loop()
            timer_handle = loop.call_later(timeout_sec, self._expire, token)
        except RuntimeError:
            timer_handle = None

        entry = ResumeEntry(
            client_id=client.id,
            token=token,
            name=client.name,
            role=client.role,
            meta=client.meta,
            rtc_capable=client.rtc_capable,
            sessions=set(client.sessions),
            pools=set(client.pools),
            topics=topics,
            presence=presence,
            timer_handle=timer_handle,
        )

        self._by_token[token] = entry

        # Remove client from sessions without broadcasting disconnect
        for sess_name in client.sessions:
            sess = self._hub.get_session(sess_name)
            if sess:
                sess.remove_client(client.id)
        client.sessions.clear()

        # Preserve pool memberships (don't remove during resume window)
        client.pools.clear()

    def restore(self, token: str) -> ResumeEntry | None:
        entry = self._by_token.get(token)
        if entry is None:
            return None

        if entry.timer_handle:
            entry.timer_handle.cancel()
        del self._by_token[token]
        self._by_client.pop(entry.client_id, None)
        return entry

    def _expire(self, token: str) -> None:
        entry = self._by_token.pop(token, None)
        if entry is None:
            return

        self._by_client.pop(entry.client_id, None)

        for sess_name in entry.sessions:
            sess = self._hub.get_session(sess_name)
            if sess is None:
                continue
            sess.broadcast({
                "header": {
                    "id": self._hub.id_gen.message_id(),
                    "resource": "session",
                    "method": "disconnected",
                    "kind": "event",
                    "session": sess_name,
                },
                "payload": {"clientId": entry.client_id, "reason": "timeout"},
            })

        for pool_name in entry.pools:
            pool = self._hub.get_pool(pool_name)
            if pool is None:
                continue
            broadcast_pool_member_left(self._hub, pool, entry.client_id, "timeout")
            pool.remove_member(entry.client_id)
            if pool.is_empty:
                self._hub.remove_pool(pool_name)

    def _expire_client(self, client: Client) -> None:
        for sess_name in list(client.sessions):
            sess = self._hub.get_session(sess_name)
            if sess is None:
                continue

            empty = sess.remove_client(client.id)

            sess.broadcast({
                "header": {
                    "id": self._hub.id_gen.message_id(),
                    "resource": "session",
                    "method": "disconnected",
                    "kind": "event",
                    "session": sess_name,
                },
                "payload": {"clientId": client.id, "reason": "left"},
            })

            if empty:
                self._hub.remove_session(sess_name)

        client.sessions.clear()

        for pool_name in list(client.pools):
            pool = self._hub.get_pool(pool_name)
            if pool is None:
                continue
            broadcast_pool_member_left(self._hub, pool, client.id, "left")
            pool.remove_member(client.id)
            if pool.is_empty:
                self._hub.remove_pool(pool_name)

        client.pools.clear()
