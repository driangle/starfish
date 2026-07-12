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
    details: Any = None


@dataclass
class DeliveryOptions:
    reliability: Literal["reliable", "unreliable", "latest"] | None = None
    ordering: Literal["ordered", "unordered"] | None = None
    prefer_transport: Literal["ws", "rtc", "auto"] | None = None
    fallback: bool | None = None
    include_self: bool | None = None


@dataclass
class FrameOptions:
    delivery: DeliveryOptions | None = None
    priority: Literal["low", "normal", "high", "critical"] | None = None
    ttl: int | None = None
    require_ack: bool | None = None


@dataclass
class StarfishFrame:
    v: int
    id: str
    type: str
    ts: int | None = None
    session: str | None = None
    from_: str | None = None
    to: str | list[str] | None = None
    topic: str | None = None
    ack: bool | None = None
    reply_to: str | None = None
    transport: Literal["ws", "rtc"] | None = None
    options: FrameOptions | None = None
    payload: Any = None
    error: StarfishError | None = None


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
    type: str | None = None
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
    return result


def _options_to_dict(o: FrameOptions) -> dict[str, Any]:
    result: dict[str, Any] = {}
    if o.delivery is not None:
        result["delivery"] = _delivery_to_dict(o.delivery)
    if o.priority is not None:
        result["priority"] = o.priority
    if o.ttl is not None:
        result["ttl"] = o.ttl
    if o.require_ack is not None:
        result["requireAck"] = o.require_ack
    return result


def frame_to_dict(frame: StarfishFrame) -> dict[str, Any]:
    """Serialize a StarfishFrame to a JSON-compatible dict with protocol field names."""
    d: dict[str, Any] = {"v": frame.v, "id": frame.id, "type": frame.type}
    if frame.ts is not None:
        d["ts"] = frame.ts
    if frame.session is not None:
        d["session"] = frame.session
    if frame.from_ is not None:
        d["from"] = frame.from_
    if frame.to is not None:
        d["to"] = frame.to
    if frame.topic is not None:
        d["topic"] = frame.topic
    if frame.ack is not None:
        d["ack"] = frame.ack
    if frame.reply_to is not None:
        d["replyTo"] = frame.reply_to
    if frame.transport is not None:
        d["transport"] = frame.transport
    if frame.options is not None:
        d["options"] = _options_to_dict(frame.options)
    if frame.payload is not None:
        d["payload"] = frame.payload
    if frame.error is not None:
        d["error"] = {
            "code": frame.error.code,
            "message": frame.error.message,
            "details": frame.error.details,
        }
    return d


def _delivery_from_dict(d: dict[str, Any]) -> DeliveryOptions:
    return DeliveryOptions(
        reliability=d.get("reliability"),
        ordering=d.get("ordering"),
        prefer_transport=d.get("preferTransport"),
        fallback=d.get("fallback"),
        include_self=d.get("includeSelf"),
    )


def _options_from_dict(d: dict[str, Any]) -> FrameOptions:
    delivery_d = d.get("delivery")
    return FrameOptions(
        delivery=_delivery_from_dict(delivery_d) if delivery_d else None,
        priority=d.get("priority"),
        ttl=d.get("ttl"),
        require_ack=d.get("requireAck"),
    )


def frame_from_dict(d: dict[str, Any]) -> StarfishFrame:
    """Deserialize a dict (from JSON) into a StarfishFrame."""
    error_d = d.get("error")
    error = StarfishError(**error_d) if error_d else None
    options_d = d.get("options")
    options = _options_from_dict(options_d) if options_d else None
    return StarfishFrame(
        v=d["v"],
        id=d["id"],
        type=d["type"],
        ts=d.get("ts"),
        session=d.get("session"),
        from_=d.get("from"),
        to=d.get("to"),
        topic=d.get("topic"),
        ack=d.get("ack"),
        reply_to=d.get("replyTo"),
        transport=d.get("transport"),
        options=options,
        payload=d.get("payload"),
        error=error,
    )
