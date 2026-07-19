import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestSession:
    def setup_method(self):
        self.hub = StarfishServer(StarfishConfig(port=0))
        self.ws = MockWebSocket()
        self.client = Client(self.hub, self.ws)  # type: ignore
        self.client.id = "client_1"
        self.client.authenticated = True

    def test_add_and_remove_client(self):
        session = self.hub.get_or_create_session("room1")
        clients = session.add_client(self.client)
        assert len(clients) == 1
        assert clients[0]["id"] == "client_1"
        assert session.has_client("client_1")

        empty = session.remove_client("client_1")
        assert empty is True
        assert not session.has_client("client_1")

    def test_subscribe_and_unsubscribe(self):
        session = self.hub.get_or_create_session("room1")
        session.add_client(self.client)

        session.subscribe("topic1", self.client)
        assert session.is_subscribed("topic1", "client_1")
        assert session.get_subscribers("topic1") == [self.client]

        session.unsubscribe("topic1", "client_1")
        assert not session.is_subscribed("topic1", "client_1")
        assert session.get_subscribers("topic1") == []

    def test_broadcast_excludes(self):
        session = self.hub.get_or_create_session("room1")

        ws2 = MockWebSocket()
        client2 = Client(self.hub, ws2)  # type: ignore
        client2.id = "client_2"
        client2.authenticated = True

        session.add_client(self.client)
        session.add_client(client2)

        frame = {"header": {"id": "test", "resource": "test", "method": "msg", "kind": "event"}}
        session.broadcast(frame, exclude_id="client_1")

        # client_1 should not receive, client_2 should
        assert len(self.ws.sent) == 0
        # client_2's queue should have received it (but we'd need to drain the queue)
        # Since send_frame puts into asyncio queue, in sync tests we check the queue
        assert client2._send_queue.qsize() == 1

    def test_remove_client_cleans_topics(self):
        session = self.hub.get_or_create_session("room1")
        session.add_client(self.client)
        session.subscribe("topic1", self.client)

        session.remove_client("client_1")
        assert session.get_subscribers("topic1") == []

    def test_get_topic_subscriber_ids(self):
        session = self.hub.get_or_create_session("room1")
        session.add_client(self.client)
        session.subscribe("topic1", self.client)

        ids = session.get_topic_subscriber_ids("topic1")
        assert ids == ["client_1"]
