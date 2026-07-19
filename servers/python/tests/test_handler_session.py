import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerSession:
    def setup_method(self):
        self.hub = StarfishServer(StarfishConfig(port=0))
        self.ws = MockWebSocket()
        self.client = Client(self.hub, self.ws)  # type: ignore
        self.client.id = "client_1"
        self.client.authenticated = True
        self.hub.register_client(self.client)

    def test_join_creates_session(self):
        frame = make_frame("session", "join", session="room1", payload={"create": True})
        self.hub.handler.dispatch(self.client, frame)

        assert "room1" in self.client.sessions
        assert self.hub.get_session("room1") is not None

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["method"] == "join"
        assert msg["header"]["kind"] == "response"
        assert msg["payload"]["status"] == "ok"
        assert msg["payload"]["clientId"] == "client_1"

    def test_join_without_create_fails(self):
        frame = make_frame("session", "join", session="nonexistent")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "session.not_found"

    def test_join_broadcasts_connected(self):
        # First client joins
        frame = make_frame("session", "join", session="room1", payload={"create": True})
        self.hub.handler.dispatch(self.client, frame)
        self.client._send_queue.get_nowait()  # consume join response

        # Second client joins
        ws2 = MockWebSocket()
        client2 = Client(self.hub, ws2)  # type: ignore
        client2.id = "client_2"
        client2.authenticated = True
        self.hub.register_client(client2)

        frame2 = make_frame("session", "join", session="room1", payload={"create": True})
        self.hub.handler.dispatch(client2, frame2)

        # client_1 should get a connected event
        assert self.client._send_queue.qsize() == 1
        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["method"] == "connected"
        assert msg["payload"]["client"]["id"] == "client_2"

    def test_leave_session(self):
        # Join first
        frame = make_frame("session", "join", session="room1", payload={"create": True})
        self.hub.handler.dispatch(self.client, frame)
        self.client._send_queue.get_nowait()

        # Leave
        frame = make_frame("session", "leave", session="room1")
        self.hub.handler.dispatch(self.client, frame)

        assert "room1" not in self.client.sessions
        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["method"] == "leave"
        assert msg["payload"]["status"] == "ok"

        # Session should be destroyed (empty)
        assert self.hub.get_session("room1") is None

    def test_leave_nonexistent_session(self):
        frame = make_frame("session", "leave", session="nonexistent")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "session.not_found"
