# Pool Matchmaking Example
# ------------------------
# Demonstrates: pool enter, auto-matching, and joining matched sessions
#
# Run: python pool_matchmaking.py
# Requires: Starfish server running at ws://localhost:8080/starfish
#
# This example creates two clients that enter the same pool in auto mode.
# The server pairs them, and they join the matched session and exchange
# a message over pub/sub.

import asyncio
import os

from starfish import StarfishClient, StarfishClientOptions, ClientIdentity, PoolEnterOptions

SERVER_URL = os.environ.get("STARFISH_SERVER_URL", "ws://localhost:8080/starfish")


def create_client(name: str) -> StarfishClient:
    return StarfishClient(
        StarfishClientOptions(server=SERVER_URL, client=ClientIdentity(name=name))
    )


async def main():
    client_a = create_client("clientA")
    client_b = create_client("clientB")

    # Connect both clients and join a staging session (required before entering a pool)
    await client_a.connect()
    await client_b.connect()
    await client_a.join("pool-matchmaking-staging")
    await client_b.join("pool-matchmaking-staging")
    print("Both clients connected and joined staging session.")

    # Track when each client is matched
    match_a: asyncio.Future[str] = asyncio.get_event_loop().create_future()
    match_b: asyncio.Future[str] = asyncio.get_event_loop().create_future()

    client_a.pool_matched.subscribe(lambda event: (
        print(f"clientA matched! Session: {event.session}, peers: {', '.join(p.id for p in event.peers)}"),
        match_a.set_result(event.session) if not match_a.done() else None,
    ))

    client_b.pool_matched.subscribe(lambda event: (
        print(f"clientB matched! Session: {event.session}, peers: {', '.join(p.id for p in event.peers)}"),
        match_b.set_result(event.session) if not match_b.done() else None,
    ))

    # Enter the pool — auto mode pairs clients automatically
    print("Both clients entering pool 'distant-touch'...")
    await asyncio.gather(
        client_a.pool_enter(PoolEnterOptions(pool="distant-touch", group_size=2)),
        client_b.pool_enter(PoolEnterOptions(pool="distant-touch", group_size=2)),
    )
    print("Both clients entered the pool.")

    # Wait for both clients to be matched
    session_a, session_b = await asyncio.gather(match_a, match_b)
    print(f"Both clients matched into session: {session_a}")

    # Join the matched session
    await client_a.join(session_a)
    await client_b.join(session_b)
    print("Both clients joined the matched session.")

    # Set up clientB to receive a message
    await client_b.subscribe("greetings")
    received: asyncio.Future[None] = asyncio.get_event_loop().create_future()

    client_b.topic_stream("greetings").subscribe(
        lambda frame: (
            print(f"clientB received: {frame.payload}"),
            received.set_result(None) if not received.done() else None,
        )
    )

    await asyncio.sleep(0.2)

    # clientA sends a ping
    print('clientA publishing ping on "greetings" topic...')
    await client_a.publish("greetings", {"message": "ping"})

    await received

    # Clean up
    await client_a.disconnect()
    await client_b.disconnect()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
