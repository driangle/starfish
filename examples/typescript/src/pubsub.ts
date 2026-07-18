// Pub/Sub Example
// ----------------
// Demonstrates: topic subscribe, publish, and message handling
//
// Run: npm run pubsub
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// This example creates two clients in the same session. One publishes
// messages to a topic, the other receives them.

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const SERVER_URL = "ws://localhost:8080/starfish";

function createClient(name: string) {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: { name },
  });
}

async function main() {
  const publisher = createClient("publisher");
  const subscriber = createClient("subscriber");

  // Connect both clients and join the same session
  await publisher.connect();
  await subscriber.connect();
  await publisher.join("pubsub-demo");
  await subscriber.join("pubsub-demo");
  console.log("Both clients connected and joined session.");

  // Subscribe to the "chat" topic
  await subscriber.subscribe("chat");
  console.log("Subscriber listening on 'chat' topic.");

  // Listen for messages on the topic using topic$()
  subscriber.topic$("chat").subscribe((frame) => {
    console.log(`[${frame.header.from}] ${frame.payload?.text}`);
  });

  // Give the subscription a moment to propagate
  await sleep(200);

  // Publish a few messages
  const messages = ["Hello from publisher!", "How is everyone?", "Goodbye!"];
  for (const text of messages) {
    console.log(`Publishing: "${text}"`);
    publisher.publish("chat", { text });
    await sleep(300);
  }

  // Unsubscribe and clean up
  await subscriber.unsubscribe("chat");
  console.log("Subscriber unsubscribed from 'chat'.");

  await publisher.disconnect();
  await subscriber.disconnect();
  console.log("Done.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
