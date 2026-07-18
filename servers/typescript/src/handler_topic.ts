import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import {
  createErrorFrame,
  ERR_TOPIC_INVALID,
} from "./errors.js";
import { MAX_TOPIC_NAME_LENGTH } from "./limits.js";

function validateTopic(hub: StarfishServer, client: Client, frame: StarfishFrame): string | null {
  if (!frame.header.topic || frame.header.topic.length > MAX_TOPIC_NAME_LENGTH) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_TOPIC_INVALID, "topic", frame.header.method),
    );
    return null;
  }
  return frame.header.topic;
}

export function handleTopicSubscribe(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const topic = validateTopic(hub, client, frame);
  if (!topic) return;

  const session = hub.getSession(frame.header.session!)!;
  session.subscribe(topic, client);

  let sessionTopics = client.topics.get(frame.header.session!);
  if (!sessionTopics) {
    sessionTopics = new Set();
    client.topics.set(frame.header.session!, sessionTopics);
  }
  sessionTopics.add(topic);

  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "topic",
      method: "subscribe",
      kind: "response",
      session: frame.header.session,
      topic,
      replyTo: frame.header.id,
    },
    payload: { status: "ok" },
  });

  sendTopicPeers(hub, session, topic);
}

export function handleTopicUnsubscribe(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const topic = validateTopic(hub, client, frame);
  if (!topic) return;

  const session = hub.getSession(frame.header.session!)!;
  session.unsubscribe(topic, client.id);

  const sessionTopics = client.topics.get(frame.header.session!);
  if (sessionTopics) {
    sessionTopics.delete(topic);
    if (sessionTopics.size === 0) {
      client.topics.delete(frame.header.session!);
    }
  }

  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "topic",
      method: "unsubscribe",
      kind: "response",
      session: frame.header.session,
      topic,
      replyTo: frame.header.id,
    },
    payload: { status: "ok" },
  });

  sendTopicPeers(hub, session, topic);
}

export function handleTopicPublish(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const topic = validateTopic(hub, client, frame);
  if (!topic) return;

  const session = hub.getSession(frame.header.session!)!;

  const subscribers = session.getSubscribers(topic);
  for (const sub of subscribers) {
    sub.sendFrame({
      header: {
        id: hub.idGen.messageId(),
        resource: "topic",
        method: "message",
        kind: "event",
        session: frame.header.session,
        topic,
        from: client.id,
      },
      payload: frame.payload,
    });
  }
}

function sendTopicPeers(hub: StarfishServer, session: { getTopicSubscriberIds(topic: string): string[]; getSubscribers(topic: string): Client[] }, topic: string): void {
  const subscriberIds = session.getTopicSubscriberIds(topic);
  const subscribers = session.getSubscribers(topic);

  const frame: StarfishFrame = {
    header: {
      id: hub.idGen.messageId(),
      resource: "topic",
      method: "peers",
      kind: "event",
      topic,
    },
    payload: { subscribers: subscriberIds },
  };

  for (const sub of subscribers) {
    sub.sendFrame(frame);
  }
}
