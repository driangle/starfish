import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerData:
    def setup_method(self):
        self.hub = StarfishServer(StarfishConfig(port=0))
        self.ws = MockWebSocket()
        self.client = Client(self.hub, self.ws)  # type: ignore
        self.client.id = "client_1"
        self.client.authenticated = True
        self.hub.register_client(self.client)

        # Join session
        frame = make_frame("session", "join", session="room1", payload={"create": True})
        self.hub.handler.dispatch(self.client, frame)
        self.client._send_queue.get_nowait()

    def test_save_and_get(self):
        frame = make_frame("data", "save", session="room1", payload={
            "key": "score",
            "scope": "session",
            "op": "replace",
            "data": 42,
        })
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["status"] == "ok"
        assert msg["payload"]["data"] == 42
        assert msg["payload"]["version"] == 1

        # Also broadcasts data.changed
        msg2 = json.loads(self.client._send_queue.get_nowait())
        assert msg2["header"]["method"] == "changed"

        # Get it back
        frame = make_frame("data", "get", session="room1", payload={
            "key": "score",
            "scope": "session",
        })
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["data"] == 42
        assert msg["payload"]["version"] == 1

    def test_save_conflict(self):
        # First write
        frame = make_frame("data", "save", session="room1", payload={
            "key": "x",
            "scope": "session",
            "op": "replace",
            "data": "v1",
        })
        self.hub.handler.dispatch(self.client, frame)
        while not self.client._send_queue.empty():
            self.client._send_queue.get_nowait()

        # Conflicting write
        frame = make_frame("data", "save", session="room1", payload={
            "key": "x",
            "scope": "session",
            "op": "replace",
            "data": "v2",
            "expectedVersion": 0,
        })
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "data.conflict"

    def test_save_invalid_scope(self):
        frame = make_frame("data", "save", session="room1", payload={
            "key": "x",
            "scope": "invalid",
            "op": "replace",
            "data": "v1",
        })
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "protocol.invalid_frame"

    def test_save_self_scope(self):
        frame = make_frame("data", "save", session="room1", payload={
            "key": "prefs",
            "scope": "self",
            "op": "replace",
            "data": {"theme": "dark"},
        })
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["status"] == "ok"
        # Self-scope should NOT broadcast
        assert self.client._send_queue.empty()
