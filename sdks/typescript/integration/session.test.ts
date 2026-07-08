import { describe, it, expect, afterEach } from "vitest";
import { createClient, uniqueSession } from "./setup.js";
import type { StarfishClient, ClientInfo } from "../src/index.js";

describe("SDK: session", () => {
  const clients: StarfishClient[] = [];
  const track = (name?: string) => {
    const c = createClient(name);
    clients.push(c);
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.disconnect()));
    clients.length = 0;
  });

  it("join() creates a session and returns session.joined", async () => {
    const client = track("joiner");
    await client.connect();
    const session = uniqueSession();

    const response = await client.join(session);

    expect(response.type).toBe("session.joined");
    expect(response.session).toBe(session);
    expect(response.payload.clients).toHaveLength(1);
    expect(response.payload.clients[0].id).toBe(client.clientId);
  });

  it("clients$ includes all session members", async () => {
    const session = uniqueSession();

    const client1 = track("first");
    await client1.connect();
    await client1.join(session);

    const client2 = track("second");
    await client2.connect();
    await client2.join(session);

    // client2 should see both clients after joining
    const ids = client2.clients$.value.map((c) => c.id);
    expect(ids).toContain(client1.clientId);
    expect(ids).toContain(client2.clientId);
  });

  it("peers$ excludes self", async () => {
    const session = uniqueSession();

    const client1 = track("first");
    await client1.connect();
    await client1.join(session);

    const client2 = track("second");
    await client2.connect();
    await client2.join(session);

    const peerIds = client2.peers$.value.map((c) => c.id);
    expect(peerIds).toContain(client1.clientId);
    expect(peerIds).not.toContain(client2.clientId);
  });

  it("client.connected updates clients$ on first client", async () => {
    const session = uniqueSession();

    const client1 = track("first");
    await client1.connect();
    await client1.join(session);

    expect(client1.clients$.value).toHaveLength(1);

    // Wait for client.connected event to arrive
    const connected = new Promise<ClientInfo[]>((resolve) => {
      client1.clients$.subscribe((clients) => {
        if (clients.length === 2) resolve(clients);
      });
    });

    const client2 = track("second");
    await client2.connect();
    await client2.join(session);

    const updatedClients = await connected;
    expect(updatedClients).toHaveLength(2);
  });

  it("leave() clears session state", async () => {
    const client = track("leaver");
    await client.connect();
    await client.join(uniqueSession());

    expect(client.clients$.value.length).toBeGreaterThan(0);

    await client.leave();

    expect(client.clients$.value).toEqual([]);
    expect(client.peers$.value).toEqual([]);
  });
});
