import json

from helpers import MockWebSocket, make_frame

from starfish_server.client import Client
from starfish_server.config import StarfishConfig
from starfish_server.server import StarfishServer


class TestHandlerConnection:
    def setup_method(self):
        self.hub = StarfishServer(StarfishConfig(port=0))
        self.ws = MockWebSocket()
        self.client = Client(self.hub, self.ws)  # type: ignore

    def test_fresh_hello(self):
        frame = make_frame("client", "hello", payload={"versions": [2]})
        self.hub.handler.dispatch(self.client, frame)

        assert self.client.authenticated is True
        assert self.client.id.startswith("client_")
        assert self.client.id in [c.id for c in self.hub.get_clients()]

        # Check welcome was queued
        assert self.client._send_queue.qsize() == 1
        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["resource"] == "client"
        assert msg["header"]["method"] == "welcome"
        assert msg["header"]["kind"] == "response"
        assert msg["payload"]["status"] == "ok"
        assert msg["payload"]["version"] == 2
        assert msg["payload"]["clientId"] == self.client.id
        assert "resumeToken" in msg["payload"]

    def test_hello_with_client_info(self):
        frame = make_frame("client", "hello", payload={
            "versions": [2],
            "client": {"name": "test-client", "role": "visuals", "meta": {"color": "red"}},
            "capabilities": {"rtc": True},
        })
        self.hub.handler.dispatch(self.client, frame)

        assert self.client.name == "test-client"
        assert self.client.role == "visuals"
        assert self.client.meta == {"color": "red"}
        assert self.client.rtc_capable is True

    def test_hello_unsupported_version(self):
        frame = make_frame("client", "hello", payload={"versions": [99]})
        self.hub.handler.dispatch(self.client, frame)

        assert self.client.authenticated is False
        assert self.client._send_queue.qsize() == 1
        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"]["error"]["code"] == "protocol.unsupported_version"

    def test_hello_empty_versions(self):
        # A client that offers no versions (e.g. a resume hello) is accepted at
        # the default supported version for backwards compatibility.
        frame = make_frame("client", "hello", payload={"versions": []})
        self.hub.handler.dispatch(self.client, frame)

        assert self.client.authenticated is True
        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["header"]["method"] == "welcome"
        assert msg["payload"]["version"] == 2

    def test_resume_success(self):
        # First do a fresh hello
        frame = make_frame("client", "hello", payload={"versions": [2]})
        self.hub.handler.dispatch(self.client, frame)
        msg = json.loads(self.client._send_queue.get_nowait())
        token = msg["payload"]["resumeToken"]
        original_id = self.client.id

        # Simulate disconnect - store resume
        self.hub.resumes.store(self.client)
        self.hub.remove_client(self.client)

        # New connection resumes with the token
        ws2 = MockWebSocket()
        client2 = Client(self.hub, ws2)  # type: ignore
        frame2 = make_frame("client", "hello", payload={"versions": [2], "resumeToken": token})
        self.hub.handler.dispatch(client2, frame2)

        assert client2.authenticated is True
        assert client2.id == original_id
        msg2 = json.loads(client2._send_queue.get_nowait())
        assert msg2["payload"]["resumed"] is True
        assert msg2["payload"]["clientId"] == original_id

    def test_resume_invalid_token(self):
        frame = make_frame("client", "hello", payload={"versions": [2], "resumeToken": "rt_invalid"})
        self.hub.handler.dispatch(self.client, frame)

        # Should fall through to fresh hello
        assert self.client.authenticated is True
        msg = json.loads(self.client._send_queue.get_nowait())
        assert msg["payload"].get("resumed") is not True
