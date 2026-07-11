import type { Client, ClientInfo } from "./client.js";
import type { StarfishFrame } from "./types.js";
import type { Hub } from "./hub.js";
import { PresenceThrottle } from "./presence.js";

export class Session {
  readonly name: string;
  private clients = new Map<string, Client>();
  private topics = new Map<string, Map<string, Client>>();
  private presence: PresenceThrottle;
  private presenceData = new Map<string, unknown>();

  constructor(name: string, hub: Hub) {
    this.name = name;
    this.presence = new PresenceThrottle(this, hub);
  }

  addClient(client: Client): ClientInfo[] {
    this.clients.set(client.id, client);

    const infos: ClientInfo[] = [];
    for (const c of this.clients.values()) {
      infos.push(c.info());
    }
    return infos;
  }

  removeClient(clientId: string): boolean {
    this.clients.delete(clientId);
    this.presenceData.delete(clientId);

    for (const [topic, subs] of this.topics) {
      subs.delete(clientId);
      if (subs.size === 0) {
        this.topics.delete(topic);
      }
    }

    return this.clients.size === 0;
  }

  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  broadcast(frame: StarfishFrame, excludeId?: string): void {
    for (const [id, client] of this.clients) {
      if (id !== excludeId) {
        client.sendFrame(frame);
      }
    }
  }

  subscribe(topic: string, client: Client): void {
    let subs = this.topics.get(topic);
    if (!subs) {
      subs = new Map();
      this.topics.set(topic, subs);
    }
    subs.set(client.id, client);
  }

  unsubscribe(topic: string, clientId: string): void {
    const subs = this.topics.get(topic);
    if (!subs) return;
    subs.delete(clientId);
    if (subs.size === 0) {
      this.topics.delete(topic);
    }
  }

  isSubscribed(topic: string, clientId: string): boolean {
    return this.topics.get(topic)?.has(clientId) ?? false;
  }

  getSubscribers(topic: string): Client[] {
    const subs = this.topics.get(topic);
    if (!subs) return [];
    return [...subs.values()];
  }

  getTopicSubscriberIds(topic: string): string[] {
    const subs = this.topics.get(topic);
    if (!subs) return [];
    return [...subs.keys()];
  }

  setPresence(clientId: string, payload: unknown): void {
    this.presenceData.set(clientId, payload);
    this.presence.set(clientId, payload);
  }

  getPresence(clientId: string): unknown {
    return this.presenceData.get(clientId);
  }

  destroy(): void {
    this.presence.stop();
  }
}
