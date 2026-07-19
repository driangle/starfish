import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerSystem:
    def setup_method(self):
        self.hub = StarfishServer(StarfishConfig(port=0))
        self.ws = MockWebSocket()
        self.client = Client(self.hub, self.ws)  # type: ignore
        self.client.id = "client_1"
        self.client.authenticated = True
        self.hub.register_client(self.client)

    def test_clock_sync(self):
        frame = make_frame("clock", "sync")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["method"] == "sync"
        assert msg["header"]["kind"] == "response"
        assert msg["payload"]["status"] == "ok"
        assert "serverTime" in msg["payload"]
        assert isinstance(msg["payload"]["serverTime"], int)

    def test_clock_sync_no_auth_required(self):
        # Clock sync should work without auth
        self.client.authenticated = False
        frame = make_frame("clock", "sync")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["status"] == "ok"

    def test_ack_routing(self):
        ws2 = MockWebSocket()
        client2 = Client(self.hub, ws2)  # type: ignore
        client2.id = "client_2"
        client2.authenticated = True
        self.hub.register_client(client2)

        frame = make_frame("ack", "ack", to="client_2", replyTo="orig_msg_1")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(client2._send_queue.get_nowait())
        assert msg["header"]["resource"] == "ack"
        assert msg["header"]["method"] == "ack"
        assert msg["header"]["from"] == "client_1"

    def test_ack_without_reply_to(self):
        frame = make_frame("ack", "ack", to="client_2")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "protocol.invalid_frame"
