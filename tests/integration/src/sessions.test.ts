import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { leaveFrame, joinFrame } from "./helpers/frames.js";
import { uniqueSession, SHORT_TIMEOUT } from "./helpers/setup.js";

describe("sessions", () => {
  const clients: StarfishTestClient[] = [];
  const track = async () => {
    const c = await StarfishTestClient.connect();
    clients.push(c);
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.close()));
    clients.length = 0;
  });

  it("join with create: true creates session and returns session.joined", async () => {
    const client = await track();
    await client.hello({ name: "creator" });
    const session = uniqueSession();

    const joined = await client.join(session, { create: true });

    expect(joined.header.resource).toBe("session");
    expect(joined.header.method).toBe("join");
    expect(joined.header.session).toBe(session);
    expect(joined.payload?.clientId).toBe(client.clientId);
    expect(joined.payload?.clients).toBeDefined();
    expect(Array.isArray(joined.payload?.clients)).toBe(true);
    expect((joined.payload?.clients as any[]).length).toBe(1);
    expect((joined.payload?.clients as any[])[0].id).toBe(client.clientId);
  });

  it("join without create on nonexistent session returns session.not_found", async () => {
    const client = await track();
    await client.hello({ name: "joiner" });

    const frame = joinFrame("nonexistent-session-xyz", { create: false });
    await client.send(frame);
    const response = await client.waitForReply(frame.header.id);

    expect((response.payload as any)?.status).toBe("error");
    expect((response.payload as any)?.error?.code).toBe("session.not_found");
  });

  it("second client joining triggers client.connected on first", async () => {
    const session = uniqueSession();

    const client1 = await track();
    await client1.hello({ name: "first" });
    await client1.join(session);

    const client2 = await track();
    await client2.hello({ name: "second" });
    await client2.join(session);

    // Client 1 should receive session.connected about client 2
    const connected = await client1.waitForType("session.connected");
    expect(connected.header.session).toBe(session);
    expect(connected.payload?.client).toBeDefined();
    expect((connected.payload?.client as any).id).toBe(client2.clientId);
  });

  it("session.joined contains full client list for second joiner", async () => {
    const session = uniqueSession();

    const client1 = await track();
    await client1.hello({ name: "first" });
    await client1.join(session);

    const client2 = await track();
    await client2.hello({ name: "second" });
    const joined = await client2.join(session);

    expect((joined.payload?.clients as any[]).length).toBe(2);
    const clientIds = (joined.payload?.clients as any[]).map((c: any) => c.id);
    expect(clientIds).toContain(client1.clientId);
    expect(clientIds).toContain(client2.clientId);
  });

  it("session.leave triggers client.disconnected with reason 'left'", async () => {
    const session = uniqueSession();

    const client1 = await track();
    await client1.hello({ name: "stayer" });
    await client1.join(session);

    const client2 = await track();
    await client2.hello({ name: "leaver" });
    await client2.join(session);

    // Drain the session.connected event from client1
    await client1.waitForType("session.connected");

    // Client 2 leaves
    const leave = leaveFrame(session);
    await client2.send(leave);

    // Client 1 should see session.disconnected
    const disconnected = await client1.waitForType("session.disconnected");
    expect(disconnected.header.session).toBe(session);
    expect(disconnected.payload?.clientId).toBe(client2.clientId);
    expect(disconnected.payload?.reason).toBe("left");
  });

  it("session is ephemeral — destroyed when last client leaves", async () => {
    const session = uniqueSession();

    const client1 = await track();
    await client1.hello({ name: "only-one" });
    await client1.join(session, { create: true });

    // Leave the session
    const leave = leaveFrame(session);
    await client1.send(leave);
    // Give server time to clean up
    await new Promise((r) => setTimeout(r, 100));

    // New client tries to join without create — should fail
    const client2 = await track();
    await client2.hello({ name: "late-joiner" });
    const frame = joinFrame(session, { create: false });
    await client2.send(frame);
    const response = await client2.waitForReply(frame.header.id);

    expect((response.payload as any)?.status).toBe("error");
    expect((response.payload as any)?.error?.code).toBe("session.not_found");
  });

  it(
    "WebSocket disconnect triggers client.disconnected with reason 'timeout'",
    { timeout: 45000 },
    async () => {
      const session = uniqueSession();

      const client1 = await track();
      const welcome = await client1.hello({ name: "stayer" });
      await client1.join(session);

      const client2 = await track();
      await client2.hello({ name: "disconnector" });
      await client2.join(session);

      // Drain the session.connected event
      await client1.waitForType("session.connected");

      // Use the server's reported resume timeout to know how long to wait
      // Add a buffer for processing time
      const resumeTimeout = (welcome.payload as any)?.resumeTimeout ?? 30000;
      const waitTime = resumeTimeout + 5000;

      // Forcefully close client2's connection (simulates network drop)
      await client2.close();

      // Client 1 should eventually see session.disconnected with reason "timeout"
      // This takes as long as the server's resume timeout
      const disconnected = await client1.waitForType("session.disconnected", waitTime);
      expect(disconnected.header.session).toBe(session);
      expect(disconnected.payload?.clientId).toBe(client2.clientId);
      expect(disconnected.payload?.reason).toBe("timeout");
    },
  );
});
