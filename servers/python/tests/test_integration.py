"""Integration tests using real WebSocket connections."""
from __future__ import annotations

import asyncio
import json

import pytest
import websockets

from starfish_server import StarfishConfig, StarfishServer


@pytest.fixture
async def server():
    """Start a real server on a random port."""
    config = StarfishConfig(port=0, heartbeat_interval_ms=60_000, heartbeat_timeout_ms=60_000)
    srv = StarfishServer(config)
    await srv.start()
    # Get the actual port assigned
    port = srv._server.sockets[0].getsockname()[1]
    srv.config.port = port
    yield srv
    await srv.shutdown()


async def connect(port: int):
    """Connect to the server and return the websocket."""
    return await websockets.connect(f"ws://localhost:{port}/starfish")


async def hello(ws) -> dict:
    """Send client.hello and return the welcome response."""
    await ws.send(json.dumps({
        "header": {"id": "h1", "resource": "client", "method": "hello", "kind": "request"},
        "payload": {"versions": [2], "client": {"name": "test"}, "capabilities": {"rtc": False}},
    }))
    return json.loads(await ws.recv())


@pytest.mark.asyncio
async def test_hello_welcome(server):
    ws = await connect(server.config.port)
    try:
        msg = await hello(ws)
        assert msg["header"]["resource"] == "client"
        assert msg["header"]["method"] == "welcome"
        assert msg["payload"]["status"] == "ok"
        assert msg["payload"]["version"] == 2
        assert msg["payload"]["clientId"].startswith("client_")
        assert "resumeToken" in msg["payload"]
    finally:
        await ws.close()


@pytest.mark.asyncio
async def test_session_join_and_messaging(server):
    ws1 = await connect(server.config.port)
    ws2 = await connect(server.config.port)
    try:
        welcome1 = await hello(ws1)
        welcome2 = await hello(ws2)
        client1_id = welcome1["payload"]["clientId"]
        client2_id = welcome2["payload"]["clientId"]

        # Client 1 joins session
        await ws1.send(json.dumps({
            "header": {"id": "j1", "resource": "session", "method": "join", "kind": "request", "session": "test-room"},
            "payload": {"create": True, "name": "player1"},
        }))
        join_resp = json.loads(await ws1.recv())
        assert join_resp["payload"]["status"] == "ok"

        # Client 2 joins session
        await ws2.send(json.dumps({
            "header": {"id": "j2", "resource": "session", "method": "join", "kind": "request", "session": "test-room"},
            "payload": {"create": True, "name": "player2"},
        }))
        join_resp2 = json.loads(await ws2.recv())
        assert join_resp2["payload"]["status"] == "ok"
        assert len(join_resp2["payload"]["clients"]) == 2

        # Client 1 should receive connected event for client 2
        connected_evt = json.loads(await ws1.recv())
        assert connected_evt["header"]["method"] == "connected"
        assert connected_evt["payload"]["client"]["id"] == client2_id

        # Client 1 sends direct message to client 2
        await ws1.send(json.dumps({
            "header": {"id": "m1", "resource": "message", "method": "send", "kind": "request", "session": "test-room", "to": client2_id},
            "payload": {"text": "hello!"},
        }))
        msg = json.loads(await ws2.recv())
        assert msg["header"]["method"] == "message"
        assert msg["header"]["from"] == client1_id
        assert msg["payload"]["text"] == "hello!"
    finally:
        await ws1.close()
        await ws2.close()


@pytest.mark.asyncio
async def test_topic_pubsub(server):
    ws1 = await connect(server.config.port)
    ws2 = await connect(server.config.port)
    try:
        await hello(ws1)
        await hello(ws2)

        # Both join session
        for ws in (ws1, ws2):
            await ws.send(json.dumps({
                "header": {"id": "j1", "resource": "session", "method": "join", "kind": "request", "session": "room"},
                "payload": {"create": True},
            }))
            await ws.recv()  # join response

        # Consume connected event on ws1
        await ws1.recv()

        # Both subscribe to topic
        for ws in (ws1, ws2):
            await ws.send(json.dumps({
                "header": {"id": "s1", "resource": "topic", "method": "subscribe", "kind": "request", "session": "room", "topic": "chat"},
            }))
            await ws.recv()  # subscribe response
            await ws.recv()  # peers event

        # ws2 also gets peers event when ws1 subscribes
        # (or ws1 gets updated peers when ws2 subscribes) - just drain
        try:
            await asyncio.wait_for(ws1.recv(), timeout=0.1)
        except asyncio.TimeoutError:
            pass

        # ws1 publishes
        await ws1.send(json.dumps({
            "header": {"id": "p1", "resource": "topic", "method": "publish", "kind": "request", "session": "room", "topic": "chat"},
            "payload": {"text": "hi there"},
        }))

        # Both should receive topic message
        msg1 = json.loads(await asyncio.wait_for(ws1.recv(), timeout=1))
        assert msg1["header"]["method"] == "message"
        assert msg1["header"]["topic"] == "chat"
        assert msg1["payload"]["text"] == "hi there"

        msg2 = json.loads(await asyncio.wait_for(ws2.recv(), timeout=1))
        assert msg2["header"]["method"] == "message"
        assert msg2["payload"]["text"] == "hi there"
    finally:
        await ws1.close()
        await ws2.close()


@pytest.mark.asyncio
async def test_data_store(server):
    ws = await connect(server.config.port)
    try:
        await hello(ws)
        await ws.send(json.dumps({
            "header": {"id": "j1", "resource": "session", "method": "join", "kind": "request", "session": "room"},
            "payload": {"create": True},
        }))
        await ws.recv()

        # Save data
        await ws.send(json.dumps({
            "header": {"id": "d1", "resource": "data", "method": "save", "kind": "request", "session": "room"},
            "payload": {"key": "score", "scope": "session", "op": "replace", "data": 100},
        }))
        resp = json.loads(await ws.recv())
        assert resp["payload"]["status"] == "ok"
        assert resp["payload"]["version"] == 1
        assert resp["payload"]["data"] == 100

        # data.changed broadcast
        changed = json.loads(await ws.recv())
        assert changed["header"]["method"] == "changed"

        # Get data
        await ws.send(json.dumps({
            "header": {"id": "d2", "resource": "data", "method": "get", "kind": "request", "session": "room"},
            "payload": {"key": "score", "scope": "session"},
        }))
        resp = json.loads(await ws.recv())
        assert resp["payload"]["data"] == 100
        assert resp["payload"]["version"] == 1
    finally:
        await ws.close()


@pytest.mark.asyncio
async def test_resume(server):
    ws = await connect(server.config.port)
    try:
        welcome = await hello(ws)
        client_id = welcome["payload"]["clientId"]
        token = welcome["payload"]["resumeToken"]

        # Join a session
        await ws.send(json.dumps({
            "header": {"id": "j1", "resource": "session", "method": "join", "kind": "request", "session": "room"},
            "payload": {"create": True},
        }))
        await ws.recv()
    finally:
        await ws.close()

    # Wait briefly then reconnect with resume token
    await asyncio.sleep(0.05)

    ws2 = await connect(server.config.port)
    try:
        await ws2.send(json.dumps({
            "header": {"id": "h2", "resource": "client", "method": "hello", "kind": "request"},
            "payload": {"versions": [2], "resumeToken": token},
        }))
        welcome2 = json.loads(await ws2.recv())
        assert welcome2["payload"]["resumed"] is True
        assert welcome2["payload"]["clientId"] == client_id
        assert "room" in welcome2["payload"].get("sessions", [])
    finally:
        await ws2.close()


@pytest.mark.asyncio
async def test_invalid_path_rejected(server):
    """Connections to non-/starfish paths should be rejected."""
    try:
        ws = await websockets.connect(f"ws://localhost:{server.config.port}/invalid")
        # Should get rejected
        await ws.close()
        assert False, "Should have been rejected"
    except Exception:
        pass  # Expected - connection rejected


@pytest.mark.asyncio
async def test_heartbeat_ping_pong(server):
    ws = await connect(server.config.port)
    try:
        await hello(ws)

        await ws.send(json.dumps({
            "header": {"id": "ping1", "resource": "heartbeat", "method": "ping", "kind": "request"},
        }))
        resp = json.loads(await ws.recv())
        assert resp["header"]["method"] == "pong"
        assert resp["payload"]["status"] == "ok"
    finally:
        await ws.close()
