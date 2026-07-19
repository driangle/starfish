from __future__ import annotations

from typing import TYPE_CHECKING, Callable

from .client import Client
from .errors import ERR_AUTH_REQUIRED, ERR_PROTOCOL_INVALID_FRAME, ERR_SESSION_NOT_FOUND, create_error_frame
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer

HandlerFunc = Callable[[Client, StarfishFrame], None]


class Handler:
    def __init__(self, hub: StarfishServer) -> None:
        self._hub = hub
        self._handlers: dict[str, HandlerFunc] = {}
        self._register_handlers()

    def dispatch(self, client: Client, frame: StarfishFrame) -> None:
        header = frame.get("header", {})
        key = f"{header.get('resource')}/{header.get('method')}"
        handler = self._handlers.get(key)
        if handler is None:
            client.send_frame(
                create_error_frame(
                    self._hub.id_gen,
                    header.get("id", ""),
                    ERR_PROTOCOL_INVALID_FRAME,
                    header.get("resource"),
                    header.get("method"),
                )
            )
            return
        handler(client, frame)

    def _register_handlers(self) -> None:
        from .handler_connection import handle_client_hello
        from .handler_data import handle_data_get, handle_data_save
        from .handler_messaging import handle_client_send, handle_session_broadcast
        from .handler_pool import handle_pool_enter, handle_pool_leave
        from .handler_pool_match import (
            handle_pool_accept,
            handle_pool_assign,
            handle_pool_claim,
            handle_pool_reject,
        )
        from .handler_presence import handle_presence_set
        from .handler_rtc import handle_rtc_answer, handle_rtc_connect, handle_rtc_ice, handle_rtc_offer
        from .handler_session import handle_session_join, handle_session_leave
        from .handler_system import handle_ack, handle_clock_sync, handle_nack
        from .handler_topic import handle_topic_publish, handle_topic_subscribe, handle_topic_unsubscribe

        hub = self._hub

        self._handlers["client/hello"] = lambda c, f: handle_client_hello(hub, c, f)
        self._handlers["heartbeat/ping"] = lambda c, f: self._handle_ping(c, f)

        # Auth-required handlers
        self._handlers["session/join"] = self._require_auth(lambda c, f: handle_session_join(hub, c, f))
        self._handlers["session/leave"] = self._require_auth(lambda c, f: handle_session_leave(hub, c, f))

        # Auth + session required
        self._handlers["topic/subscribe"] = self._require_auth(
            self._require_session(lambda c, f: handle_topic_subscribe(hub, c, f))
        )
        self._handlers["topic/unsubscribe"] = self._require_auth(
            self._require_session(lambda c, f: handle_topic_unsubscribe(hub, c, f))
        )
        self._handlers["topic/publish"] = self._require_auth(
            self._require_session(lambda c, f: handle_topic_publish(hub, c, f))
        )
        self._handlers["message/send"] = self._require_auth(
            self._require_session(lambda c, f: handle_client_send(hub, c, f))
        )
        self._handlers["session/broadcast"] = self._require_auth(
            self._require_session(lambda c, f: handle_session_broadcast(hub, c, f))
        )
        self._handlers["presence/set"] = self._require_auth(
            self._require_session(lambda c, f: handle_presence_set(hub, c, f))
        )
        self._handlers["data/save"] = self._require_auth(
            self._require_session(lambda c, f: handle_data_save(hub, c, f))
        )
        self._handlers["data/get"] = self._require_auth(
            self._require_session(lambda c, f: handle_data_get(hub, c, f))
        )
        self._handlers["rtc/connect"] = self._require_auth(
            self._require_session(lambda c, f: handle_rtc_connect(hub, c, f))
        )
        self._handlers["rtc/offer"] = self._require_auth(
            self._require_session(lambda c, f: handle_rtc_offer(hub, c, f))
        )
        self._handlers["rtc/answer"] = self._require_auth(
            self._require_session(lambda c, f: handle_rtc_answer(hub, c, f))
        )
        self._handlers["rtc/ice"] = self._require_auth(
            self._require_session(lambda c, f: handle_rtc_ice(hub, c, f))
        )

        # Auth-required, no session needed
        self._handlers["pool/enter"] = self._require_auth(lambda c, f: handle_pool_enter(hub, c, f))
        self._handlers["pool/leave"] = self._require_auth(lambda c, f: handle_pool_leave(hub, c, f))
        self._handlers["pool/claim"] = self._require_auth(lambda c, f: handle_pool_claim(hub, c, f))
        self._handlers["pool/accept"] = self._require_auth(lambda c, f: handle_pool_accept(hub, c, f))
        self._handlers["pool/reject"] = self._require_auth(lambda c, f: handle_pool_reject(hub, c, f))
        self._handlers["pool/assign"] = self._require_auth(lambda c, f: handle_pool_assign(hub, c, f))

        # No auth required
        self._handlers["clock/sync"] = lambda c, f: handle_clock_sync(hub, c, f)

        # Auth-required
        self._handlers["ack/ack"] = self._require_auth(lambda c, f: handle_ack(hub, c, f))
        self._handlers["ack/nack"] = self._require_auth(lambda c, f: handle_nack(hub, c, f))

    def _require_auth(self, fn: HandlerFunc) -> HandlerFunc:
        def wrapper(client: Client, frame: StarfishFrame) -> None:
            if not client.authenticated:
                header = frame.get("header", {})
                client.send_frame(
                    create_error_frame(
                        self._hub.id_gen,
                        header.get("id", ""),
                        ERR_AUTH_REQUIRED,
                        header.get("resource"),
                        header.get("method"),
                    )
                )
                return
            fn(client, frame)

        return wrapper

    def _require_session(self, fn: HandlerFunc) -> HandlerFunc:
        def wrapper(client: Client, frame: StarfishFrame) -> None:
            header = frame.get("header", {})
            session = header.get("session")
            if not session or session not in client.sessions:
                client.send_frame(
                    create_error_frame(
                        self._hub.id_gen,
                        header.get("id", ""),
                        ERR_SESSION_NOT_FOUND,
                        header.get("resource"),
                        header.get("method"),
                    )
                )
                return
            fn(client, frame)

        return wrapper

    def _handle_ping(self, client: Client, frame: StarfishFrame) -> None:
        client.send_frame(
            {
                "header": {
                    "id": self._hub.id_gen.message_id(),
                    "resource": "heartbeat",
                    "method": "pong",
                    "kind": "response",
                    "ts": _now_ms(),
                    "replyTo": frame.get("header", {}).get("id", ""),
                },
                "payload": {"status": "ok"},
            }
        )


def _now_ms() -> int:
    import time
    return int(time.time() * 1000)
