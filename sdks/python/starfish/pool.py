from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .connection import Connection
from .emitter import EventStream, Observable
from .id import next_id
from .types import StarfishFrame, StarfishHeader


@dataclass
class PoolEnterOptions:
    pool: str
    create: bool = True
    mode: str = "auto"
    group_size: int = 2
    role: str | None = None
    attributes: dict[str, Any] | None = None
    filter: dict[str, Any] | None = None


@dataclass
class PoolMember:
    id: str
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class PoolMatchResult:
    pool: str
    session: str
    peers: list[PoolMember]


@dataclass
class PoolEnteredResult:
    pool: str
    mode: str
    group_size: int
    members: list[PoolMember] = field(default_factory=list)


class Pool:
    def __init__(self, connection: Connection) -> None:
        self._connection = connection
        self._member_observables: dict[str, Observable[list[PoolMember]]] = {}
        self.matched: EventStream[PoolMatchResult] = EventStream()

    async def enter(self, options: PoolEnterOptions) -> PoolEnteredResult:
        payload: dict[str, Any] = {
            "pool": options.pool,
            "create": options.create,
            "groupSize": options.group_size,
        }
        if options.mode != "auto":
            payload["mode"] = options.mode
        if options.role is not None:
            payload["role"] = options.role
        if options.attributes is not None:
            payload["attributes"] = options.attributes
        if options.filter is not None:
            payload["filter"] = options.filter

        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pool"),
                resource="pool",
                method="enter",
                kind="request",
            ),
            payload=payload,
        )

        response = await self._connection.send_and_wait(frame)
        resp_payload = response.payload or {}

        if resp_payload.get("status") == "error":
            err = resp_payload.get("error", {})
            if err.get("code") == "pool.not_found":
                raise RuntimeError(f"Pool not found: {err.get('message', '')}")
            raise RuntimeError(f"Pool enter error: {err.get('message', 'Unknown error')}")

        members_data: list[dict[str, Any]] = resp_payload.get("members", [])
        members = [PoolMember(id=m["id"], attributes=m.get("attributes", {})) for m in members_data]

        pool_name = resp_payload.get("pool", options.pool)
        obs = self._member_observables.get(pool_name)
        if not obs:
            obs = Observable(members)
            self._member_observables[pool_name] = obs
        else:
            obs.set(members)

        return PoolEnteredResult(
            pool=pool_name,
            mode=resp_payload.get("mode", options.mode),
            group_size=resp_payload.get("groupSize", options.group_size),
            members=members,
        )

    async def leave(self, pool: str) -> None:
        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pool"),
                resource="pool",
                method="leave",
                kind="request",
            ),
            payload={"pool": pool},
        )
        await self._connection.send(frame)

    async def claim(self, pool: str, target: str) -> None:
        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pool"),
                resource="pool",
                method="claim",
                kind="request",
            ),
            payload={"pool": pool, "target": target},
        )
        await self._connection.send(frame)

    async def accept(self, pool: str, from_: str) -> None:
        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pool"),
                resource="pool",
                method="accept",
                kind="request",
            ),
            payload={"pool": pool, "from": from_},
        )
        await self._connection.send(frame)

    async def reject(self, pool: str, from_: str) -> None:
        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pool"),
                resource="pool",
                method="reject",
                kind="request",
            ),
            payload={"pool": pool, "from": from_},
        )
        await self._connection.send(frame)

    async def assign(self, pool: str, groups: list[list[str]]) -> StarfishFrame:
        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pool"),
                resource="pool",
                method="assign",
                kind="request",
            ),
            payload={"pool": pool, "groups": groups},
        )
        return await self._connection.send_and_wait(frame)

    def members(self, pool: str) -> Observable[list[PoolMember]]:
        obs = self._member_observables.get(pool)
        if not obs:
            obs = Observable([])
            self._member_observables[pool] = obs
        return obs

    def handle_frame(self, frame: StarfishFrame) -> None:
        if frame.header.resource != "pool" or frame.header.kind != "event":
            return

        payload = frame.payload or {}

        if frame.header.method == "matched":
            peers_data: list[dict[str, Any]] = payload.get("peers", [])
            result = PoolMatchResult(
                pool=payload["pool"],
                session=payload["session"],
                peers=[
                    PoolMember(id=p["id"], attributes=p.get("attributes", {})) for p in peers_data
                ],
            )
            self.matched.emit(result)

        elif frame.header.method == "member.joined":
            pool_name = payload.get("pool", "")
            member_data = payload.get("member", {})
            member = PoolMember(
                id=member_data["id"],
                attributes=member_data.get("attributes", {}),
            )
            obs = self._member_observables.get(pool_name)
            if obs:
                current = list(obs.value)
                current.append(member)
                obs.set(current)

        elif frame.header.method == "member.left":
            pool_name = payload.get("pool", "")
            member_id = payload.get("memberId", "")
            obs = self._member_observables.get(pool_name)
            if obs:
                current = [m for m in obs.value if m.id != member_id]
                obs.set(current)
