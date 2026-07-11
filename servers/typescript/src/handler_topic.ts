import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import {
  createErrorFrame,
  ERR_TOPIC_INVALID,
} from "./errors.js";
import { MAX_TOPIC_NAME_LENGTH } from "./limits.js";

function validateTopic(hub: Hub, client: Client, frame: StarfishFrame): string | null {
  if (!frame.topic || frame.topic.length > MAX_TOPIC_NAME_LENGTH) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_TOPIC_INVALID),
    );
    return null;
  }
  return frame.topic;
}

export function handleTopicSubscribe(hub: Hub, client: Client, frame: StarfishFrame): void {
  const topic = validateTopic(hub, client, frame);
  if (!topic) return;

  const session = hub.getSession(frame.session!)!;
  session.subscribe(topic, client);

  let sessionTopics = client.topics.get(frame.session!);
  if (!sessionTopics) {
    sessionTopics = new Set();
    client.topics.set(frame.session!, sessionTopics);
  }
  sessionTopics.add(topic);

  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "topic.subscribed",
    session: frame.session,
    topic,
    replyTo: frame.id,
  });

  sendTopicPeers(hub, session, topic);
}

export function handleTopicUnsubscribe(hub: Hub, client: Client, frame: StarfishFrame): void {
  const topic = validateTopic(hub, client, frame);
  if (!topic) return;

  const session = hub.getSession(frame.session!)!;
  session.unsubscribe(topic, client.id);

  const sessionTopics = client.topics.get(frame.session!);
  if (sessionTopics) {
    sessionTopics.delete(topic);
    if (sessionTopics.size === 0) {
      client.topics.delete(frame.session!);
    }
  }

  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "topic.unsubscribed",
    session: frame.session,
    topic,
    replyTo: frame.id,
  });

  sendTopicPeers(hub, session, topic);
}

export function handleTopicPublish(hub: Hub, client: Client, frame: StarfishFrame): void {
  const topic = validateTopic(hub, client, frame);
  if (!topic) return;

  const session = hub.getSession(frame.session!)!;

  const subscribers = session.getSubscribers(topic);
  for (const sub of subscribers) {
    sub.sendFrame({
      v: 1,
      id: hub.idGen.messageId(),
      type: "topic.message",
      session: frame.session,
      topic,
      from: client.id,
      payload: frame.payload,
    });
  }
}

function sendTopicPeers(hub: Hub, session: { getTopicSubscriberIds(topic: string): string[]; getSubscribers(topic: string): Client[] }, topic: string): void {
  const subscriberIds = session.getTopicSubscriberIds(topic);
  const subscribers = session.getSubscribers(topic);

  const frame: StarfishFrame = {
    v: 1,
    id: hub.idGen.messageId(),
    type: "topic.peers",
    topic,
    payload: { subscribers: subscriberIds },
  };

  for (const sub of subscribers) {
    sub.sendFrame(frame);
  }
}
