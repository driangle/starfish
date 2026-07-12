# Connection Example
# -------------------
# Demonstrates: client setup, handshake, session join/leave, connection state tracking
#
# Run: python connection.py
# Requires: Starfish server running at ws://localhost:8080/starfish

import asyncio
import os

from starfish import StarfishClient, StarfishClientOptions, ClientIdentity

SERVER_URL = os.environ.get("STARFISH_SERVER_URL", "ws://localhost:8080/starfish")


async def main():
    # Create a client with identity metadata
    client = StarfishClient(
        StarfishClientOptions(
            server=SERVER_URL,
            client=ClientIdentity(name="connection-example", role="demo", meta={"version": 1}),
        )
    )

    # Subscribe to connection state changes
    client.connection_state.subscribe(lambda state: print(f"Connection state: {state}"))

    # Connect to the server (performs WebSocket handshake + client.hello/server.welcome)
    print("Connecting...")
    await client.connect()
    print(f"Connected! Client ID: {client.client_id}")

    # Join a session -- creates it if it doesn't exist
    print("Joining session...")
    result = await client.join("example-session")
    print(f"Joined session: {result.payload}")

    # Listen for other clients joining/leaving
    client.clients.subscribe(lambda clients: print(f"Clients in session: {len(clients)}"))

    # Stay connected for a few seconds to demonstrate the heartbeat
    print("Listening for 3 seconds...")
    await asyncio.sleep(3)

    # Leave the session
    print("Leaving session...")
    await client.leave()

    # Disconnect from the server
    print("Disconnecting...")
    await client.disconnect()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
