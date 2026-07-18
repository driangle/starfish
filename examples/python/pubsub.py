# Pub/Sub Example
# ----------------
# Demonstrates: topic subscribe, publish, and message handling
#
# Run: python pubsub.py
# Requires: Starfish server running at ws://localhost:8080/starfish
#
# This example creates two clients in the same session. One publishes
# messages to a topic, the other receives them.

import asyncio
import os

from starfish import StarfishClient, StarfishClientOptions, ClientIdentity

SERVER_URL = os.environ.get("STARFISH_SERVER_URL", "ws://localhost:8080/starfish")


def create_client(name: str) -> StarfishClient:
    return StarfishClient(
        StarfishClientOptions(server=SERVER_URL, client=ClientIdentity(name=name))
    )


async def main():
    publisher = create_client("publisher")
    subscriber = create_client("subscriber")

    # Connect both clients and join the same session
    await publisher.connect()
    await subscriber.connect()
    await publisher.join("pubsub-demo")
    await subscriber.join("pubsub-demo")
    print("Both clients connected and joined session.")

    # Subscribe to the "chat" topic
    await subscriber.subscribe("chat")
    print("Subscriber listening on 'chat' topic.")

    # Listen for messages on the topic using topic_stream()
    subscriber.topic_stream("chat").subscribe(
        lambda frame: print(f"[{frame.header.from_}] {frame.payload['text']}")
    )

    # Give the subscription a moment to propagate
    await asyncio.sleep(0.2)

    # Publish a few messages
    messages = ["Hello from publisher!", "How is everyone?", "Goodbye!"]
    for text in messages:
        print(f'Publishing: "{text}"')
        await publisher.publish("chat", {"text": text})
        await asyncio.sleep(0.3)

    # Unsubscribe and clean up
    await subscriber.unsubscribe("chat")
    print("Subscriber unsubscribed from 'chat'.")

    await publisher.disconnect()
    await subscriber.disconnect()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
