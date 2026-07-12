# Clock Sync Example
# -------------------
# Demonstrates: synchronized timing across clients using the Clock API
#
# Run: python clock_sync.py
# Requires: Starfish server running at ws://localhost:8080/starfish
#
# Two clients sync their clocks with the server, then compare their
# synchronized time to show they agree on "now" despite network latency.

import asyncio
import os
import time

from starfish import StarfishClient, StarfishClientOptions, ClientIdentity

SERVER_URL = os.environ.get("STARFISH_SERVER_URL", "ws://localhost:8080/starfish")


def create_client(name: str) -> StarfishClient:
    return StarfishClient(
        StarfishClientOptions(server=SERVER_URL, client=ClientIdentity(name=name))
    )


def now_ms() -> float:
    return time.time() * 1000


async def main():
    client_a = create_client("Client-A")
    client_b = create_client("Client-B")

    await client_a.connect()
    await client_b.connect()
    await client_a.join("clock-demo")
    await client_b.join("clock-demo")
    print("Both clients connected.\n")

    # Show local time vs synced time before sync
    print("Before sync:")
    print(f"  Client-A local time:  {now_ms():.0f}")
    print(f"  Client-A synced time: {client_a.clock.now():.0f}")
    print(f"  Client-A offset:      {client_a.clock.offset:.0f}ms\n")

    # Sync both clients' clocks with the server
    # sync() takes multiple round-trip samples (default: 5) and computes the median offset
    print("Syncing clocks (5 samples each)...")
    offset_a = await client_a.clock.sync()
    offset_b = await client_b.clock.sync()

    print(f"  Client-A offset: {offset_a:.0f}ms")
    print(f"  Client-B offset: {offset_b:.0f}ms")
    print(f"  Difference:      {abs(offset_a - offset_b):.0f}ms\n")

    # Compare synchronized times -- they should be very close
    time_a = client_a.clock.now()
    time_b = client_b.clock.now()
    print("After sync:")
    print(f"  Client-A synced time: {time_a:.0f}")
    print(f"  Client-B synced time: {time_b:.0f}")
    print(f"  Difference:           {abs(time_a - time_b):.0f}ms\n")

    # Schedule a callback at a specific server time
    # Both clients schedule the same server time -- they should fire at nearly the same moment
    target_time = client_a.clock.now() + 1000  # 1 second from now
    print(f"Scheduling callback at server time {target_time:.0f} (1 second from now)...")

    done = asyncio.get_running_loop().create_future()
    fired = 0

    def on_fire(name: str):
        nonlocal fired
        print(f"  {name} fired at local time {now_ms():.0f}")
        fired += 1
        if fired == 2 and not done.done():
            done.set_result(None)

    client_a.at(target_time, lambda: on_fire("Client-A"))
    client_b.at(target_time, lambda: on_fire("Client-B"))

    await done

    print()
    await client_a.disconnect()
    await client_b.disconnect()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
