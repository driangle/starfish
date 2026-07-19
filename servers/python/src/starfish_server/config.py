from __future__ import annotations

from dataclasses import dataclass, field

from .limits import MAX_WS_MESSAGE_SIZE


@dataclass
class ICEServer:
    urls: str


@dataclass
class StarfishConfig:
    port: int = 8080
    heartbeat_interval_ms: int = 15_000
    heartbeat_timeout_ms: int = 30_000
    resume_timeout_ms: int = 30_000
    max_ws_message_size: int = MAX_WS_MESSAGE_SIZE
    ice_servers: list[ICEServer] = field(default_factory=lambda: [ICEServer(urls="stun:stun.l.google.com:19302")])


def default_config() -> StarfishConfig:
    return StarfishConfig()
