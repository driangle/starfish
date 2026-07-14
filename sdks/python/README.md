# Starfish Python SDK

Python client library for the Starfish realtime protocol.

## Installation

```bash
pip install starfish-client
```

## Quick Start

```python
import asyncio
from starfish import StarfishClient, StarfishClientOptions

async def main():
    client = StarfishClient(StarfishClientOptions(url="ws://localhost:4040"))
    await client.connect()
    await client.join("my-session")

    # Subscribe to a topic
    await client.subscribe("chat", lambda frame: print(frame))

    # Publish a message
    await client.publish("chat", {"text": "Hello!"})

asyncio.run(main())
```

## License

MIT
