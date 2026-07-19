import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerTopic:
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
        self.client._send_queue.get_nowait()  # consume join response

    def test_subscribe(self):
        frame = make_frame("topic", "subscribe", session="room1", topic="chat")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["method"] == "subscribe"
        assert msg["payload"]["status"] == "ok"

        # Should also get peers event
        msg2 = json.loads(self.client._send_queue.get_nowait())
        assert msg2["header"]["method"] == "peers"
        assert msg2["payload"]["subscribers"] == ["client_1"]

    def test_unsubscribe(self):
        # Subscribe first
        frame = make_frame("topic", "subscribe", session="room1", topic="chat")
        self.hub.handler.dispatch(self.client, frame)
        while not self.client._send_queue.empty():
            self.client._send_queue.get_nowait()

        # Unsubscribe
        frame = make_frame("topic", "unsubscribe", session="room1", topic="chat")
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["method"] == "unsubscribe"
        assert msg["payload"]["status"] == "ok"

    def test_publish_to_subscribers(self):
        # Two clients subscribe
        ws2 = MockWebSocket()
        client2 = Client(self.hub, ws2)  # type: ignore
        client2.id = "client_2"
        client2.authenticated = True
        self.hub.register_client(client2)

        frame = make_frame("session", "join", session="room1", payload={"create": True})
        self.hub.handler.dispatch(client2, frame)
        client2._send_queue.get_nowait()
        self.client._send_queue.get_nowait()  # connected event

        # Both subscribe
        frame = make_frame("topic", "subscribe", session="room1", topic="chat")
        self.hub.handler.dispatch(self.client, frame)
        while not self.client._send_queue.empty():
            self.client._send_queue.get_nowait()
        while not client2._send_queue.empty():
            client2._send_queue.get_nowait()

        frame = make_frame("topic", "subscribe", session="room1", topic="chat")
        self.hub.handler.dispatch(client2, frame)
        while not self.client._send_queue.empty():
            self.client._send_queue.get_nowait()
        while not client2._send_queue.empty():
            client2._send_queue.get_nowait()

        # client_1 publishes
        frame = make_frame("topic", "publish", session="room1", topic="chat", payload={"text": "hello"})
        self.hub.handler.dispatch(self.client, frame)

        # Both should receive the message
        msg1 = json.loads(self.client._send_queue.get_nowait())
        assert msg1["header"]["method"] == "message"
        assert msg1["header"]["from"] == "client_1"
        assert msg1["payload"]["text"] == "hello"

        msg2 = json.loads(client2._send_queue.get_nowait())
        assert msg2["header"]["method"] == "message"
        assert msg2["payload"]["text"] == "hello"

    def test_invalid_topic(self):
        frame = make_frame("topic", "subscribe", session="room1")
        # No topic in header
        self.hub.handler.dispatch(self.client, frame)

        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "topic.invalid"
