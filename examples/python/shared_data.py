# Shared Data Example
# --------------------
# Demonstrates: collaborative state with save, get, data_key_stream, and optimistic concurrency
#
# Run: python shared_data.py
# Requires: Starfish server running at ws://localhost:8080/starfish
#
# Two clients share a counter and a config object, demonstrating
# replace, counter.add, and merge operations with version tracking.

import asyncio
import json
import os

from starfish import StarfishClient, StarfishClientOptions, ClientIdentity, SaveOptions

SERVER_URL = os.environ.get("STARFISH_SERVER_URL", "ws://localhost:8080/starfish")


def create_client(name: str) -> StarfishClient:
    return StarfishClient(
        StarfishClientOptions(server=SERVER_URL, client=ClientIdentity(name=name))
    )


async def main():
    client_a = create_client("Client-A")
    client_b = create_client("Client-B")

    await client_a.connect()
    await client_b.connect()
    await client_a.join("shared-data-demo")
    await client_b.join("shared-data-demo")
    print("Both clients joined session.\n")

    # Watch all data changes from Client-B's perspective
    client_b.data_changed.subscribe(
        lambda r: print(f"[Client-B] Data changed: {r.key} = {json.dumps(r.data)} (v{r.version})")
    )

    await asyncio.sleep(0.2)

    # --- Replace operation: set a value ---
    print("Client-A sets 'config' to { theme: 'dark', fontSize: 14 }")
    r1 = await client_a.save(
        SaveOptions(key="config", scope="session", op="replace", data={"theme": "dark", "fontSize": 14})
    )
    print(f"  Saved at version {r1.version}\n")
    await asyncio.sleep(0.3)

    # --- Merge operation: partial update ---
    print("Client-B merges { fontSize: 18 } into 'config'")
    r2 = await client_b.save(
        SaveOptions(key="config", scope="session", op="merge", data={"fontSize": 18})
    )
    print(f"  Merged at version {r2.version}\n")
    await asyncio.sleep(0.3)

    # --- Get operation: read current value ---
    current = await client_a.get("config", "session")
    print(f"Client-A reads 'config': {json.dumps(current.data)} (v{current.version})\n")

    # --- Counter operation ---
    print("Client-A initializes 'score' to 0")
    await client_a.save(SaveOptions(key="score", scope="session", op="replace", data=0))
    await asyncio.sleep(0.2)

    print("Client-A increments 'score' by 10")
    await client_a.save(SaveOptions(key="score", scope="session", op="counter.add", data=10))
    await asyncio.sleep(0.2)

    print("Client-B increments 'score' by 5")
    await client_b.save(SaveOptions(key="score", scope="session", op="counter.add", data=5))
    await asyncio.sleep(0.2)

    score = await client_a.get("score", "session")
    print(f"\nFinal score: {score.data} (v{score.version})")

    # --- Watch specific key ---
    print("\nClient-A watches 'status' key:")
    client_a.data_key_stream("status").subscribe(
        lambda r: print(f"  status updated to: {json.dumps(r.data)}")
    )

    await client_b.save(SaveOptions(key="status", scope="session", op="replace", data="ready"))
    await asyncio.sleep(0.2)
    await client_b.save(SaveOptions(key="status", scope="session", op="replace", data="running"))
    await asyncio.sleep(0.2)

    # Clean up
    await client_a.disconnect()
    await client_b.disconnect()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
