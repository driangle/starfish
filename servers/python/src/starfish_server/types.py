from __future__ import annotations

from typing import Any

# A frame is a plain dict matching the wire format:
# {"header": {"id": ..., "resource": ..., "method": ..., "kind": ..., ...}, "payload": {...}}
StarfishFrame = dict[str, Any]


def parse_to(to: str | list[str] | None) -> list[str]:
    if to is None:
        return []
    if isinstance(to, str):
        return [to]
    return to


def include_self(frame: StarfishFrame) -> bool:
    delivery = frame.get("header", {}).get("delivery")
    if delivery is None:
        return False
    return delivery.get("includeSelf", False) is True


def require_ack(frame: StarfishFrame) -> bool:
    delivery = frame.get("header", {}).get("delivery")
    if delivery is None:
        return False
    return delivery.get("requireAck", False) is True
