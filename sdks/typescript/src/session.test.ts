import { describe, it, expect, vi, beforeEach } from "vitest";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
import type { StarfishFrame, ClientInfo } from "./types.js";
import { resetIdCounter } from "./id.js";

function mockConnection(clientId: string = "me"): Connection {
  return {
    clientId,
    send: vi.fn(),
    sendAndWait: vi.fn(),
  } as unknown as Connection;
}

function clientInfo(id: string, name?: string): ClientInfo {
  return { id, name: name ?? id, role: "default" };
}

describe("Session", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("starts with no session", () => {
    const session = new Session(mockConnection());
    expect(session.current).toBeNull();
    expect(session.clients$.value).toEqual([]);
    expect(session.peers$.value).toEqual([]);
  });

  it("join() sends session.join and updates state from response", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    const clients = [clientInfo("me"), clientInfo("alice")];
    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients },
    });

    const response = await session.join("room-1");

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          resource: "session",
          method: "join",
          session: "room-1",
        }),
        payload: expect.objectContaining({ create: true }),
      }),
    );
    expect(session.current).toBe("room-1");
    expect(response.header.method).toBe("join");
    expect(response.header.kind).toBe("response");
  });

  it("join() populates clients$ with all clients from response", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    const clients = [clientInfo("me"), clientInfo("alice"), clientInfo("bob")];
    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients },
    });

    await session.join("room-1");

    expect(session.clients$.value).toHaveLength(3);
    expect(session.clients$.value.map((c) => c.id)).toEqual(["me", "alice", "bob"]);
  });

  it("peers$ excludes self from client list", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    const clients = [clientInfo("me"), clientInfo("alice"), clientInfo("bob")];
    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients },
    });

    await session.join("room-1");

    expect(session.peers$.value).toHaveLength(2);
    expect(session.peers$.value.map((c) => c.id)).toEqual(["alice", "bob"]);
  });

  it("join() passes options to the frame payload", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients: [] },
    });

    await session.join("room-1", {
      name: "Player1",
      role: "host",
      meta: { color: "red" },
      create: false,
    });

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          name: "Player1",
          role: "host",
          meta: { color: "red" },
          create: false,
        },
      }),
    );
  });

  it("leave() clears session and client state", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients: [clientInfo("me")] },
    });

    await session.join("room-1");
    await session.leave();

    expect(session.current).toBeNull();
    expect(session.clients$.value).toEqual([]);
    expect(session.peers$.value).toEqual([]);
    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          resource: "session",
          method: "leave",
          session: "room-1",
        }),
      }),
    );
  });

  it("leave() is a no-op when not in a session", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    await session.leave();

    expect(conn.send).not.toHaveBeenCalled();
  });

  it("handleFrame client.connected adds a client", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients: [clientInfo("me")] },
    });
    await session.join("room-1");

    session.handleFrame({
      header: {
        id: "evt_1",
        resource: "session",
        method: "connected",
        kind: "event",
        session: "room-1",
      },
      payload: { client: clientInfo("alice", "Alice") },
    });

    expect(session.clients$.value).toHaveLength(2);
    expect(session.peers$.value).toHaveLength(1);
    expect(session.peers$.value[0].id).toBe("alice");
  });

  it("handleFrame client.disconnected removes a client", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients: [clientInfo("me"), clientInfo("alice")] },
    });
    await session.join("room-1");

    session.handleFrame({
      header: {
        id: "evt_1",
        resource: "session",
        method: "disconnected",
        kind: "event",
        session: "room-1",
      },
      payload: { clientId: "alice" },
    });

    expect(session.clients$.value).toHaveLength(1);
    expect(session.clients$.value[0].id).toBe("me");
    expect(session.peers$.value).toHaveLength(0);
  });

  it("re-joining a session replaces the client list", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    vi.mocked(conn.sendAndWait)
      .mockResolvedValueOnce({
        header: {
          id: "resp_1",
          resource: "session",
          method: "join",
          kind: "response",
          replyTo: "join_1",
        },
        payload: { clients: [clientInfo("me"), clientInfo("alice")] },
      })
      .mockResolvedValueOnce({
        header: {
          id: "resp_2",
          resource: "session",
          method: "join",
          kind: "response",
          replyTo: "join_2",
        },
        payload: { clients: [clientInfo("me"), clientInfo("bob")] },
      });

    await session.join("room-1");
    expect(session.clients$.value).toHaveLength(2);

    await session.join("room-2");
    expect(session.current).toBe("room-2");
    expect(session.clients$.value.map((c) => c.id)).toEqual(["me", "bob"]);
  });

  it("notifies subscribers when clients change", async () => {
    const conn = mockConnection("me");
    const session = new Session(conn);

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      header: {
        id: "resp_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "join_1",
      },
      payload: { clients: [clientInfo("me")] },
    });

    const clientUpdates: ClientInfo[][] = [];
    const peerUpdates: ClientInfo[][] = [];
    session.clients$.subscribe((v) => clientUpdates.push(v));
    session.peers$.subscribe((v) => peerUpdates.push(v));

    await session.join("room-1");

    session.handleFrame({
      header: {
        id: "evt_1",
        resource: "session",
        method: "connected",
        kind: "event",
        session: "room-1",
      },
      payload: { client: clientInfo("alice") },
    });

    // join + connect = 2 updates each
    expect(clientUpdates).toHaveLength(2);
    expect(peerUpdates).toHaveLength(2);
    expect(clientUpdates[1]).toHaveLength(2);
    expect(peerUpdates[1]).toHaveLength(1);
  });
});
