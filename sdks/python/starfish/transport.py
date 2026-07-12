from __future__ import annotations

from typing import Protocol, TypedDict

from .types import DeliveryOptions, StarfishError, StarfishFrame


class RTCState(Protocol):
    def is_peer_connected(self, peer_id: str) -> bool: ...
    def get_connected_peer_ids(self) -> list[str]: ...
    def get_topic_peers(self, topic: str) -> list[str]: ...


class WSDecision(TypedDict):
    transport: str  # "ws"


class RTCDecision(TypedDict):
    transport: str  # "rtc"
    peers: list[str]


TransportDecision = WSDecision | RTCDecision


def select_transport(
    frame: StarfishFrame,
    delivery: DeliveryOptions | None,
    rtc_state: RTCState | None,
) -> TransportDecision:
    prefer = (delivery.prefer_transport if delivery else None) or "auto"

    if prefer == "ws":
        return {"transport": "ws"}

    if prefer == "rtc":
        return _select_rtc(frame, delivery, rtc_state)

    return _select_auto(frame, delivery, rtc_state)


def _select_rtc(
    frame: StarfishFrame,
    delivery: DeliveryOptions | None,
    rtc_state: RTCState | None,
) -> TransportDecision:
    peers = _resolve_available_peers(frame, rtc_state)

    if len(peers) > 0:
        return {"transport": "rtc", "peers": peers}

    if delivery is None or delivery.fallback is not False:
        return {"transport": "ws"}

    error = StarfishError(
        code="transport.unavailable",
        message="RTC transport is not available and fallback is disabled",
    )
    raise ValueError(error.message)


def _select_auto(
    frame: StarfishFrame,
    delivery: DeliveryOptions | None,
    rtc_state: RTCState | None,
) -> TransportDecision:
    frame_type = frame.type

    if (
        frame_type.startswith("data.")
        or frame_type.startswith("session.")
        or frame_type.startswith("presence.")
    ):
        return {"transport": "ws"}

    if frame_type == "topic.publish":
        reliability = (delivery.reliability if delivery else None) or "reliable"
        if reliability == "reliable":
            return {"transport": "ws"}
        topic_peers = rtc_state.get_topic_peers(frame.topic) if rtc_state and frame.topic else []
        connected = [p for p in topic_peers if rtc_state and rtc_state.is_peer_connected(p)]
        return {"transport": "rtc", "peers": connected} if connected else {"transport": "ws"}

    if frame_type == "client.send":
        peers = _resolve_available_peers(frame, rtc_state)
        return {"transport": "rtc", "peers": peers} if peers else {"transport": "ws"}

    return {"transport": "ws"}


def _resolve_available_peers(frame: StarfishFrame, rtc_state: RTCState | None) -> list[str]:
    if rtc_state is None:
        return []

    if frame.type == "topic.publish" and frame.topic:
        topic_peers = rtc_state.get_topic_peers(frame.topic)
        return [p for p in topic_peers if rtc_state.is_peer_connected(p)]

    targets: list[str]
    if isinstance(frame.to, list):
        targets = frame.to
    elif frame.to:
        targets = [frame.to]
    else:
        targets = []

    return [p for p in targets if rtc_state.is_peer_connected(p)]
