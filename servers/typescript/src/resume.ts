import type { Client } from "./client.js";
import type { Hub } from "./hub.js";

export type ResumeEntry = {
  clientId: string;
  token: string;
  name: string;
  role: string;
  meta: unknown;
  rtcCapable: boolean;
  sessions: Set<string>;
  topics: Map<string, Set<string>>;
  presence: Map<string, unknown>;
  timer: ReturnType<typeof setTimeout>;
};

export class ResumeRegistry {
  private byToken = new Map<string, ResumeEntry>();
  private byClient = new Map<string, string>();
  private hub: Hub;

  constructor(hub: Hub) {
    this.hub = hub;
  }

  registerToken(client: Client, token: string): void {
    const prev = this.byClient.get(client.id);
    if (prev) {
      const entry = this.byToken.get(prev);
      if (entry) {
        clearTimeout(entry.timer);
        this.byToken.delete(prev);
      }
    }
    this.byClient.set(client.id, token);
  }

  store(client: Client): void {
    const token = this.byClient.get(client.id);
    if (!token) {
      this.expireClient(client);
      return;
    }

    const topics = new Map<string, Set<string>>();
    for (const [sess, topicSet] of client.topics) {
      topics.set(sess, new Set(topicSet));
    }

    const presence = new Map<string, unknown>();
    for (const sessName of client.sessions) {
      const sess = this.hub.getSession(sessName);
      if (sess) {
        const data = sess.getPresence(client.id);
        if (data !== undefined) presence.set(sessName, data);
      }
    }

    const entry: ResumeEntry = {
      clientId: client.id,
      token,
      name: client.name,
      role: client.role,
      meta: client.meta,
      rtcCapable: client.rtcCapable,
      sessions: new Set(client.sessions),
      topics,
      presence,
      timer: setTimeout(() => this.expire(token), this.hub.config.resumeTimeoutMs),
    };

    this.byToken.set(token, entry);

    // Remove client from sessions without broadcasting
    for (const sessName of client.sessions) {
      const sess = this.hub.getSession(sessName);
      if (sess) sess.removeClient(client.id);
    }
    client.sessions.clear();
  }

  restore(token: string): ResumeEntry | undefined {
    const entry = this.byToken.get(token);
    if (!entry) return undefined;

    clearTimeout(entry.timer);
    this.byToken.delete(token);
    this.byClient.delete(entry.clientId);
    return entry;
  }

  private expire(token: string): void {
    const entry = this.byToken.get(token);
    if (!entry) return;

    this.byToken.delete(token);
    this.byClient.delete(entry.clientId);

    for (const sessName of entry.sessions) {
      const sess = this.hub.getSession(sessName);
      if (!sess) continue;

      sess.broadcast({
        v: 1,
        id: this.hub.idGen.messageId(),
        type: "client.disconnected",
        session: sessName,
        payload: { clientId: entry.clientId, reason: "timeout" },
      });

      // Session already had client removed in store(), check if empty
    }
  }

  private expireClient(client: Client): void {
    for (const sessName of client.sessions) {
      const sess = this.hub.getSession(sessName);
      if (!sess) continue;

      const empty = sess.removeClient(client.id);

      sess.broadcast({
        v: 1,
        id: this.hub.idGen.messageId(),
        type: "client.disconnected",
        session: sessName,
        payload: { clientId: client.id, reason: "left" },
      });

      if (empty) {
        this.hub.removeSession(sessName);
      }
    }
    client.sessions.clear();
  }
}
