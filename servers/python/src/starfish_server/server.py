from __future__ import annotations

import asyncio
from http import HTTPStatus
from typing import Any

import websockets
from websockets import ServerConnection

from .client import Client
from .config import StarfishConfig, default_config
from .handler import Handler
from .heartbeat import HeartbeatChecker
from .id import IDGenerator
from .pool import Pool, PoolMode
from .resume import ResumeRegistry
from .session import Session


class StarfishServer:
    def __init__(self, config: StarfishConfig | None = None) -> None:
        self.config = config or default_config()
        self.id_gen = IDGenerator()
        self.handler = Handler(self)
        self.resumes = ResumeRegistry(self)
        self.heartbeat = HeartbeatChecker(self)

        self._clients: dict[str, Client] = {}
        self._sessions: dict[str, Session] = {}
        self._pools: dict[str, Pool] = {}
        self._server: Any = None

    async def start(self) -> None:
        self.heartbeat.start()
        self._server = await websockets.serve(
            self._handle_connection,
            host="0.0.0.0",
            port=self.config.port,
            max_size=self.config.max_ws_message_size,
            process_request=self._process_request,
        )
        print(f"Starfish server listening on :{self.config.port}")

    async def serve_forever(self) -> None:
        await self.start()
        await asyncio.Future()  # run forever

    async def shutdown(self) -> None:
        self.heartbeat.stop()
        for client in list(self._clients.values()):
            client.close()
        self._clients.clear()
        if self._server:
            self._server.close()
            await self._server.wait_closed()

    def register_client(self, client: Client) -> None:
        self._clients[client.id] = client

    def remove_client(self, client: Client) -> None:
        if client.id and client.id in self._clients:
            del self._clients[client.id]

    def get_client(self, client_id: str) -> Client | None:
        return self._clients.get(client_id)

    def get_clients(self) -> list[Client]:
        return list(self._clients.values())

    def get_session(self, name: str) -> Session | None:
        return self._sessions.get(name)

    def get_or_create_session(self, name: str) -> Session:
        session = self._sessions.get(name)
        if session:
            return session
        session = Session(name, self)
        self._sessions[name] = session
        return session

    def remove_session(self, name: str) -> None:
        session = self._sessions.get(name)
        if session:
            session.destroy()
            del self._sessions[name]

    def get_pool(self, name: str | None) -> Pool | None:
        if name is None:
            return None
        return self._pools.get(name)

    def get_or_create_pool(self, name: str, mode: PoolMode, group_size: int) -> Pool:
        pool = self._pools.get(name)
        if pool:
            return pool
        pool = Pool(name, mode, group_size)
        self._pools[name] = pool
        return pool

    def remove_pool(self, name: str) -> None:
        self._pools.pop(name, None)

    def handle_client_disconnect(self, client: Client) -> None:
        self.resumes.store(client)

    async def _handle_connection(self, websocket: ServerConnection) -> None:
        client = Client(self, websocket)
        await client.run()

    async def _process_request(self, connection: ServerConnection, request: Any) -> Any:
        if hasattr(request, 'path'):
            path = request.path
        else:
            path = getattr(request, 'url', '/starfish')
            if hasattr(path, 'path'):
                path = path.path

        if path != "/starfish":
            return connection.respond(HTTPStatus.NOT_FOUND, "Not Found\n")
        return None
