from __future__ import annotations

import json
import time
from typing import TYPE_CHECKING, Any

from .client import Client
from .errors import ERR_PAYLOAD_TOO_LARGE, ERR_PROTOCOL_UNSUPPORTED_VERSION, create_error_frame
from .limits import MAX_CLIENT_META_SIZE
from .types import StarfishFrame

if TYPE_CHECKING:
    from .resume import ResumeEntry
    from .server import StarfishServer

SUPPORTED_VERSIONS = [1]


def handle_client_hello(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    payload = frame.get("payload") or {}
    header = frame.get("header", {})

    client_versions = payload.get("versions", [])
    negotiated = _negotiate_version(client_versions)
    if negotiated is None:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_UNSUPPORTED_VERSION, "client", "welcome")
        )
        return

    resume_token = payload.get("resumeToken")
    if resume_token:
        if _handle_resume(hub, client, frame, resume_token, negotiated):
            return

    _handle_fresh_hello(hub, client, frame, payload, negotiated)


def _negotiate_version(client_versions: list[int]) -> int | None:
    # A client that offers no versions (e.g. a resume hello) is accepted at the
    # default supported version for backwards compatibility.
    if not client_versions:
        return SUPPORTED_VERSIONS[0]
    for v in client_versions:
        if v in SUPPORTED_VERSIONS:
            return v
    return None


def _handle_resume(
    hub: StarfishServer,
    client: Client,
    frame: StarfishFrame,
    token: str,
    version: int,
) -> bool:
    entry = hub.resumes.restore(token)
    if entry is None:
        return False

    _restore_client(client, entry)
    hub.register_client(client)
    _rejoin_sessions(hub, client, entry)

    new_token = hub.id_gen.resume_token()
    hub.resumes.register_token(client, new_token)

    _send_welcome(hub, client, frame, version, {
        "clientId": client.id,
        "resumed": True,
        "resumeToken": new_token,
        "sessions": list(client.sessions),
        "pools": list(client.pools),
    })
    return True


def _handle_fresh_hello(
    hub: StarfishServer,
    client: Client,
    frame: StarfishFrame,
    payload: dict[str, Any],
    version: int,
) -> None:
    header = frame.get("header", {})
    client_id = hub.id_gen.client_id()
    resume_token = hub.id_gen.resume_token()

    client.id = client_id
    client_info = payload.get("client", {})
    if client_info:
        meta = client_info.get("meta")
        if meta is not None:
            meta_size = len(json.dumps(meta))
            if meta_size > MAX_CLIENT_META_SIZE:
                client.send_frame(
                    create_error_frame(hub.id_gen, header.get("id", ""), ERR_PAYLOAD_TOO_LARGE, "client", "welcome")
                )
                return
        client.name = client_info.get("name", "")
        client.role = client_info.get("role", "")
        client.meta = meta

    capabilities = payload.get("capabilities", {})
    if capabilities:
        client.rtc_capable = capabilities.get("rtc", False) is True

    client.authenticated = True
    client.last_activity = _now_ms()

    hub.register_client(client)
    hub.resumes.register_token(client, resume_token)

    _send_welcome(hub, client, frame, version, {
        "clientId": client_id,
        "resumeToken": resume_token,
        "sessionRequired": True,
    })


def _restore_client(client: Client, entry: ResumeEntry) -> None:
    client.id = entry.client_id
    client.name = entry.name
    client.role = entry.role
    client.meta = entry.meta
    client.rtc_capable = entry.rtc_capable
    client.sessions = set(entry.sessions)
    client.topics = {k: set(v) for k, v in entry.topics.items()}
    client.authenticated = True
    client.last_activity = _now_ms()


def _rejoin_sessions(hub: StarfishServer, client: Client, entry: ResumeEntry) -> None:
    for sess_name in client.sessions:
        sess = hub.get_session(sess_name)
        if sess is None:
            continue
        sess.add_client(client)
        topic_set = client.topics.get(sess_name)
        if topic_set:
            for topic in topic_set:
                sess.subscribe(topic, client)
        presence_data = entry.presence.get(sess_name)
        if presence_data is not None:
            sess.set_presence(client.id, presence_data)


def _send_welcome(
    hub: StarfishServer,
    client: Client,
    frame: StarfishFrame,
    version: int,
    extra: dict[str, Any],
) -> None:
    now = _now_ms()
    payload: dict[str, Any] = {
        "status": "ok",
        "version": version,
        "clientId": client.id,
        "resumeToken": "",
        "resumeTimeout": hub.config.resume_timeout_ms,
        "serverTime": now,
        "heartbeatInterval": hub.config.heartbeat_interval_ms,
        "sessionRequired": False,
        **extra,
    }

    if hub.config.ice_servers:
        payload["rtc"] = {"iceServers": [{"urls": s.urls} for s in hub.config.ice_servers]}

    client.send_frame({
        "header": {
            "v": 1,
            "id": hub.id_gen.message_id(),
            "resource": "client",
            "method": "welcome",
            "kind": "response",
            "ts": now,
            "replyTo": frame.get("header", {}).get("id", ""),
        },
        "payload": payload,
    })


def _now_ms() -> int:
    return int(time.time() * 1000)
