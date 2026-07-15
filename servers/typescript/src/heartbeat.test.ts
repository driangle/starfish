import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";
import { HeartbeatChecker } from "./heartbeat.js";

describe("HeartbeatChecker", () => {
  let hub: StarfishServer;
  let checker: HeartbeatChecker;

  beforeEach(() => {
    vi.useFakeTimers();
    hub = createTestHub();
    checker = new HeartbeatChecker(hub);
    checker.start();
  });

  afterEach(() => {
    checker.stop();
    vi.useRealTimers();
  });

  it("disconnects stale authenticated client", () => {
    const c = createTestClient(hub);
    authenticate(hub, c);

    let closed = false;
    c.close = () => { closed = true; };

    // Set lastActivity to be older than timeout
    c.lastActivity = Date.now() - hub.config.heartbeatTimeoutMs - 1;

    vi.advanceTimersByTime(hub.config.heartbeatIntervalMs);

    expect(closed).toBe(true);
  });

  it("does not disconnect active client", () => {
    const c = createTestClient(hub);
    authenticate(hub, c);

    let closed = false;
    c.close = () => { closed = true; };

    // lastActivity is recent (set during authenticate)
    vi.advanceTimersByTime(hub.config.heartbeatIntervalMs);

    expect(closed).toBe(false);
  });

  it("skips unauthenticated clients", () => {
    const c = createTestClient(hub);
    // Not authenticated
    c.lastActivity = Date.now() - hub.config.heartbeatTimeoutMs - 1;

    let closed = false;
    c.close = () => { closed = true; };

    // Register so getClients() returns it
    c.id = "test";
    hub.registerClient(c);

    vi.advanceTimersByTime(hub.config.heartbeatIntervalMs);

    expect(closed).toBe(false);
  });

  it("check runs every heartbeat interval", () => {
    const c = createTestClient(hub);
    authenticate(hub, c);

    let closeCount = 0;
    c.close = () => { closeCount++; };

    c.lastActivity = Date.now() - hub.config.heartbeatTimeoutMs - 1;

    vi.advanceTimersByTime(hub.config.heartbeatIntervalMs * 3);

    // Client closed on first check, but close may be called multiple times
    expect(closeCount).toBeGreaterThanOrEqual(1);
  });
});
