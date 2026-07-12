# Starfish Python SDK Examples

Scripts demonstrating each feature of the `starfish-client` Python SDK.

## Prerequisites

- Python 3.10+
- A running Starfish server at `ws://localhost:8080/starfish` (see [Go server instructions](../../servers/golang/README.md))

## Setup

```bash
# Install the SDK (from the repo root)
cd sdks/python && pip install -e . && cd ../..

# Or install from the examples directory
cd examples/python
pip install -r requirements.txt
```

## Examples

### Connection (`python connection.py`)

Client setup, WebSocket handshake, session join/leave, and connection state tracking.

**SDK features:** `StarfishClient`, `connect()`, `join()`, `leave()`, `disconnect()`, `connection_state`, `clients`

### Pub/Sub (`python pubsub.py`)

Two clients in the same session -- one publishes messages to a topic, the other receives them.

**SDK features:** `subscribe()`, `publish()`, `topic_stream()`, `unsubscribe()`

### Presence (`python presence.py`)

Two clients set and update presence data, observing each other's changes in real-time.

**SDK features:** `presence_set()`, `presence`, `peers`

### Shared Data (`python shared_data.py`)

Collaborative state using replace, merge, and counter operations with version tracking.

**SDK features:** `save()`, `get()`, `data_changed`, `data_key_stream()`

### Clock Sync (`python clock_sync.py`)

Synchronized timing across clients using round-trip measurement and scheduled callbacks.

**SDK features:** `clock.sync()`, `clock.now()`, `clock.offset`, `at()`
