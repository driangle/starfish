import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerMessaging:
    def setup_method(self):
        self.hub = StarfishServer(StarfishConfig(port=0))

        self.ws1 = MockWebSocket()
        self.client1 = Client(self.hub, self.ws1)  # type: ignore
        self.client1.id = "client_1"
        self.client1.authenticated = True
        self.hub.register_client(self.client1)

        self.ws2 = MockWebSocket()
        self.client2 = Client(self.hub, self.ws2)  # type: ignore
        self.client2.id = "client_2"
        self.client2.authenticated = True
        self.hub.register_client(self.client2)

        # Both join session
        for c in (self.client1, self.client2):
            frame = make_frame("session", "join", session="room1", payload={"create": True})
            self.hub.handler.dispatch(c, frame)
            c._send_queue.get_nowait()

        # Clear connected events
        while not self.client1._send_queue.empty():
            self.client1._send_queue.get_nowait()
        while not self.client2._send_queue.empty():
            self.client2._send_queue.get_nowait()

    def test_direct_message(self):
        frame = make_frame("message", "send", session="room1", to="client_2", payload={"text": "hi"})
        self.hub.handler.dispatch(self.client1, frame)

        msg = json.loads(self.client2._send_queue.get_nowait())
        assert msg["header"]["resource"] == "message"
        assert msg["header"]["method"] == "message"
        assert msg["header"]["from"] == "client_1"
        assert msg["header"]["to"] == "client_2"
        assert msg["payload"]["text"] == "hi"

    def test_direct_message_nonexistent_target(self):
        frame = make_frame("message", "send", session="room1", to="nonexistent", payload={"text": "hi"})
        self.hub.handler.dispatch(self.client1, frame)

        msg = json.loads(self.client1._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "client.not_found"

    def test_broadcast(self):
        frame = make_frame("session", "broadcast", session="room1", payload={"text": "hello all"})
        self.hub.handler.dispatch(self.client1, frame)

        # client_2 receives (sender excluded by default)
        msg = json.loads(self.client2._send_queue.get_nowait())
        assert msg["header"]["method"] == "broadcast"
        assert msg["payload"]["text"] == "hello all"
        assert msg["header"]["from"] == "client_1"

        # client_1 should NOT receive (exclude sender)
        assert self.client1._send_queue.empty()

    def test_broadcast_include_self(self):
        frame = {
            "header": {
                "id": "msg_1",
                "resource": "session",
                "method": "broadcast",
                "kind": "request",
                "session": "room1",
                "delivery": {"includeSelf": True},
            },
            "payload": {"text": "to all"},
        }
        self.hub.handler.dispatch(self.client1, frame)

        # Both should receive
        assert not self.client1._send_queue.empty()
        assert not self.client2._send_queue.empty()
