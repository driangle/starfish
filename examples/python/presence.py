# Presence Example
# -----------------
# Demonstrates: setting presence, tracking peers, and reacting to presence changes
#
# Run: python presence.py
# Requires: Starfish server running at ws://localhost:8080/starfish
#
# This example creates two clients. Each sets presence data, and both
# observe each other's presence updates.

import asyncio
import json
import os

from starfish import StarfishClient, StarfishClientOptions, ClientIdentity

SERVER_URL = os.environ.get("STARFISH_SERVER_URL", "ws://localhost:8080/starfish")


def create_client(name: str) -> StarfishClient:
    return StarfishClient(
        StarfishClientOptions(server=SERVER_URL, client=ClientIdentity(name=name))
    )


async def main():
    alice = create_client("Alice")
    bob = create_client("Bob")

    await alice.connect()
    await bob.connect()
    await alice.join("presence-demo")
    await bob.join("presence-demo")
    print("Alice and Bob joined the session.")

    # Watch presence changes from Alice's perspective
    def on_presence(presence_map):
        if not presence_map:
            return
        print("\nAlice sees presence:")
        for peer_id, data in presence_map.items():
            print(f"  {peer_id}: {json.dumps(data)}")

    alice.presence.subscribe(on_presence)

    # Watch the peer list from Bob's perspective
    bob.peers.subscribe(
        lambda peers: print(f"Bob sees {len(peers)} peer(s): {', '.join(p.name or '' for p in peers)}")
    )

    await asyncio.sleep(0.2)

    # Set presence for each client
    print("\nAlice sets presence: { status: 'active', color: 'blue' }")
    alice.presence_set({"status": "active", "color": "blue"})
    await asyncio.sleep(0.3)

    print("Bob sets presence: { status: 'away', color: 'red' }")
    bob.presence_set({"status": "away", "color": "red"})
    await asyncio.sleep(0.3)

    # Update presence
    print("Alice updates presence: { status: 'typing', color: 'blue' }")
    alice.presence_set({"status": "typing", "color": "blue"})
    await asyncio.sleep(0.3)

    # Clean up
    await alice.disconnect()
    await bob.disconnect()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
