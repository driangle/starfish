import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerRTC:
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

        # Clear all queued messages (join responses + connected events)
        while not self.client1._send_queue.empty():
            self.client1._send_queue.get_nowait()
        while not self.client2._send_queue.empty():
            self.client2._send_queue.get_nowait()

    def test_relay_offer(self):
        frame = make_frame("rtc", "offer", session="room1", to="client_2", payload={"sdp": "..."})
        self.hub.handler.dispatch(self.client1, frame)

        msg = json.loads(self.client2._send_queue.get_nowait())
        assert msg["header"]["resource"] == "rtc"
        assert msg["header"]["method"] == "offer"
        assert msg["header"]["from"] == "client_1"
        assert msg["header"]["to"] == "client_2"
        assert msg["payload"]["sdp"] == "..."

    def test_relay_no_target(self):
        frame = make_frame("rtc", "offer", session="room1", to="nonexistent", payload={"sdp": "..."})
        self.hub.handler.dispatch(self.client1, frame)

        msg = json.loads(self.client1._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "client.not_found"

    def test_relay_multiple_targets_error(self):
        frame = {
            "header": {
                "id": "msg_1",
                "resource": "rtc",
                "method": "offer",
                "kind": "request",
                "session": "room1",
                "to": ["client_2", "client_3"],
            },
            "payload": {"sdp": "..."},
        }
        self.hub.handler.dispatch(self.client1, frame)

        msg = json.loads(self.client1._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "protocol.invalid_frame"
