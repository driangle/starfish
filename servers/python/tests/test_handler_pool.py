import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerPool:
    def setup_method(self):
        self.hub = StarfishServer(StarfishConfig(port=0))

    def _make_client(self, client_id: str) -> Client:
        ws = MockWebSocket()
        c = Client(self.hub, ws)  # type: ignore
        c.id = client_id
        c.authenticated = True
        self.hub.register_client(c)
        return c

    def test_enter_creates_pool(self):
        c = self._make_client("c1")
        frame = make_frame("pool", "enter", payload={"pool": "lobby", "create": True, "groupSize": 2})
        self.hub.handler.dispatch(c, frame)

        msg = json.loads(c._send_queue.get_nowait())
        assert msg["payload"]["status"] == "ok"
        assert msg["payload"]["pool"] == "lobby"
        assert msg["payload"]["mode"] == "auto"
        assert "lobby" in c.pools

    def test_enter_nonexistent_pool_no_create(self):
        c = self._make_client("c1")
        frame = make_frame("pool", "enter", payload={"pool": "nope"})
        self.hub.handler.dispatch(c, frame)

        msg = json.loads(c._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "pool.not_found"

    def test_auto_match(self):
        c1 = self._make_client("c1")
        c2 = self._make_client("c2")

        frame = make_frame("pool", "enter", payload={"pool": "lobby", "create": True, "groupSize": 2})
        self.hub.handler.dispatch(c1, frame)
        c1._send_queue.get_nowait()  # entered response

        frame = make_frame("pool", "enter", payload={"pool": "lobby", "create": True, "groupSize": 2})
        self.hub.handler.dispatch(c2, frame)
        c2._send_queue.get_nowait()  # entered response

        # Both should receive matched event
        msg1 = json.loads(c1._send_queue.get_nowait())
        assert msg1["header"]["method"] == "matched"
        assert msg1["payload"]["pool"] == "lobby"
        assert len(msg1["payload"]["peers"]) == 2

        msg2 = json.loads(c2._send_queue.get_nowait())
        assert msg2["header"]["method"] == "matched"

    def test_leave_pool(self):
        c = self._make_client("c1")
        frame = make_frame("pool", "enter", payload={"pool": "lobby", "create": True, "groupSize": 2})
        self.hub.handler.dispatch(c, frame)
        c._send_queue.get_nowait()

        frame = make_frame("pool", "leave", payload={"pool": "lobby"})
        self.hub.handler.dispatch(c, frame)

        msg = json.loads(c._send_queue.get_nowait())
        assert msg["payload"]["status"] == "ok"
        assert "lobby" not in c.pools
        assert self.hub.get_pool("lobby") is None  # empty pool removed

    def test_claim_mode(self):
        c1 = self._make_client("c1")
        c2 = self._make_client("c2")

        frame = make_frame("pool", "enter", payload={"pool": "pick", "create": True, "mode": "claim", "groupSize": 2})
        self.hub.handler.dispatch(c1, frame)
        c1._send_queue.get_nowait()

        frame = make_frame("pool", "enter", payload={"pool": "pick", "create": True, "mode": "claim", "groupSize": 2})
        self.hub.handler.dispatch(c2, frame)
        c2._send_queue.get_nowait()

        # Clear member-joined events
        while not c1._send_queue.empty():
            c1._send_queue.get_nowait()
        while not c2._send_queue.empty():
            c2._send_queue.get_nowait()

        # c1 claims c2
        frame = make_frame("pool", "claim", payload={"pool": "pick", "target": "c2"})
        self.hub.handler.dispatch(c1, frame)

        # Both should be matched immediately in claim mode
        msg1 = json.loads(c1._send_queue.get_nowait())
        assert msg1["header"]["method"] == "matched"
