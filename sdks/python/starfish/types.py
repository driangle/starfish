from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Literal


class ConnectionState(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"


@dataclass
class StarfishError:
    code: str
    message: str
    resource: str | None = None
    retry: bool = False
    details: Any = None


@dataclass
class DeliveryOptions:
    reliability: Literal["reliable", "unreliable", "latest"] | None = None
    ordering: Literal["ordered", "unordered"] | None = None
    prefer_transport: Literal["ws", "rtc", "auto"] | None = None
    fallback: bool | None = None
    include_self: bool | None = None
    require_ack: bool | None = None


@dataclass
class HeaderOptions:
    delivery: DeliveryOptions | None = None
    priority: Literal["low", "normal", "high", "critical"] | None = None
    ttl: int | None = None
    meta: dict[str, Any] | None = None


@dataclass
class StarfishHeader:
    id: str
    resource: str
    method: str
    kind: Literal["request", "response", "event"]
    v: int | None = None
    ts: int | None = None
    session: str | None = None
    from_: str | None = None
    to: str | list[str] | None = None
    topic: str | None = None
    reply_to: str | None = None
    delivery: DeliveryOptions | None = None
    priority: Literal["low", "normal", "high", "critical"] | None = None
    ttl: int | None = None
    meta: dict[str, Any] | None = None


@dataclass
class StarfishFrame:
    header: StarfishHeader
    payload: dict[str, Any] | None = None


@dataclass
class ReconnectOptions:
    enabled: bool = True
    max_retries: float = float("inf")
    base_delay: int = 1000
    max_delay: int = 30_000


@dataclass
class ClientIdentity:
    name: str | None = None
    role: str | None = None
    meta: dict[str, Any] | None = None


@dataclass
class AuthOptions:
    type: str = "none"
    token: str | None = None


@dataclass
class StarfishClientOptions:
    server: str
    ws_factory: Callable[..., Any] | None = None
    client: ClientIdentity | None = None
    auth: AuthOptions | None = None
    reconnect: ReconnectOptions | None = None


@dataclass
class EventFilter:
    resource: str | None = None
    method: str | None = None
    topic: str | None = None
    from_: str | None = None


# --- Serialization helpers ---


def _delivery_to_dict(d: DeliveryOptions) -> dict[str, Any]:
    result: dict[str, Any] = {}
    if d.reliability is not None:
        result["reliability"] = d.reliability
    if d.ordering is not None:
        result["ordering"] = d.ordering
    if d.prefer_transport is not None:
        result["preferTransport"] = d.prefer_transport
    if d.fallback is not None:
        result["fallback"] = d.fallback
    if d.include_self is not None:
        result["includeSelf"] = d.include_self
    if d.require_ack is not None:
        result["requireAck"] = d.require_ack
    return result


def _header_to_dict(h: StarfishHeader) -> dict[str, Any]:
    d: dict[str, Any] = {
        "id": h.id,
        "resource": h.resource,
        "method": h.method,
        "kind": h.kind,
    }
    if h.v is not None:
        d["v"] = h.v
    if h.ts is not None:
        d["ts"] = h.ts
    if h.session is not None:
        d["session"] = h.session
    if h.from_ is not None:
        d["from"] = h.from_
    if h.to is not None:
        d["to"] = h.to
    if h.topic is not None:
        d["topic"] = h.topic
    if h.reply_to is not None:
        d["replyTo"] = h.reply_to
    if h.delivery is not None:
        d["delivery"] = _delivery_to_dict(h.delivery)
    if h.priority is not None:
        d["priority"] = h.priority
    if h.ttl is not None:
        d["ttl"] = h.ttl
    if h.meta is not None:
        d["meta"] = h.meta
    return d


def frame_to_dict(frame: StarfishFrame) -> dict[str, Any]:
    """Serialize a StarfishFrame to a JSON-compatible dict with protocol field names."""
    d: dict[str, Any] = {"header": _header_to_dict(frame.header)}
    if frame.payload is not None:
        d["payload"] = frame.payload
    return d


def _delivery_from_dict(d: dict[str, Any]) -> DeliveryOptions:
    return DeliveryOptions(
        reliability=d.get("reliability"),
        ordering=d.get("ordering"),
        prefer_transport=d.get("preferTransport"),
        fallback=d.get("fallback"),
        include_self=d.get("includeSelf"),
        require_ack=d.get("requireAck"),
    )


def _header_from_dict(d: dict[str, Any]) -> StarfishHeader:
    delivery_d = d.get("delivery")
    return StarfishHeader(
        id=d["id"],
        resource=d["resource"],
        method=d["method"],
        kind=d["kind"],
        v=d.get("v"),
        ts=d.get("ts"),
        session=d.get("session"),
        from_=d.get("from"),
        to=d.get("to"),
        topic=d.get("topic"),
        reply_to=d.get("replyTo"),
        delivery=_delivery_from_dict(delivery_d) if delivery_d else None,
        priority=d.get("priority"),
        ttl=d.get("ttl"),
        meta=d.get("meta"),
    )


def frame_from_dict(d: dict[str, Any]) -> StarfishFrame:
    """Deserialize a dict (from JSON) into a StarfishFrame."""
    return StarfishFrame(
        header=_header_from_dict(d["header"]),
        payload=d.get("payload"),
    )
