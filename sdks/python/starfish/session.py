from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .connection import Connection
from .emitter import Observable
from .id import next_id
from .types import StarfishFrame, StarfishHeader


@dataclass
class JoinOptions:
    name: str | None = None
    role: str | None = None
    meta: dict[str, Any] | None = None
    create: bool = True


@dataclass
class ClientInfo:
    id: str
    name: str | None = None
    role: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)


class Session:
    def __init__(self, connection: Connection) -> None:
        self._connection = connection
        self._session: str | None = None
        self._clients: dict[str, ClientInfo] = {}

        self.clients: Observable[list[ClientInfo]] = Observable([])
        self.peers: Observable[list[ClientInfo]] = Observable([])

    @property
    def current(self) -> str | None:
        return self._session

    @property
    def client_id(self) -> str | None:
        return self._connection.client_id

    async def join(self, session: str, options: JoinOptions | None = None) -> StarfishFrame:
        opts = options or JoinOptions()
        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("join"),
                resource="session",
                method="join",
                kind="request",
                session=session,
            ),
            payload={
                "create": opts.create,
                "name": opts.name or self._connection.client_id or "client",
                "role": opts.role or "default",
                "meta": opts.meta or {},
            },
        )

        response = await self._connection.send_and_wait(frame)
        self._session = session

        clients: list[dict[str, Any]] = (response.payload or {}).get("clients", [])
        self._clients.clear()
        for c in clients:
            info = ClientInfo(
                id=c["id"],
                name=c.get("name"),
                role=c.get("role"),
                meta=c.get("meta", {}),
            )
            self._clients[info.id] = info
        self._update_observables()

        return response

    async def leave(self) -> None:
        if not self._session:
            return

        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("leave"),
                resource="session",
                method="leave",
                kind="request",
                session=self._session,
            ),
        )

        await self._connection.send(frame)
        self._session = None
        self._clients.clear()
        self._update_observables()

    def handle_frame(self, frame: StarfishFrame) -> None:
        if not self._session or frame.header.session != self._session:
            return

        if frame.header.resource != "session" or frame.header.kind != "event":
            return

        if frame.header.method == "connected":
            client_data = (frame.payload or {}).get("client")
            if client_data:
                info = ClientInfo(
                    id=client_data["id"],
                    name=client_data.get("name"),
                    role=client_data.get("role"),
                    meta=client_data.get("meta", {}),
                )
                self._clients[info.id] = info
                self._update_observables()

        elif frame.header.method == "disconnected":
            client_id = (frame.payload or {}).get("clientId")
            if client_id and client_id in self._clients:
                del self._clients[client_id]
                self._update_observables()

    def _update_observables(self) -> None:
        all_clients = list(self._clients.values())
        self.clients.set(all_clients)
        self.peers.set([c for c in all_clients if c.id != self.client_id])
