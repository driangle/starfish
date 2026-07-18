import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Clock } from "./clock.js";
import type { Connection } from "./connection.js";

function mockConnection(): Connection {
  return {
    sendAndWait: vi.fn(),
  } as unknown as Connection;
}

describe("Clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with zero offset", () => {
    const conn = mockConnection();
    const clock = new Clock(conn);
    expect(clock.offset).toBe(0);
  });

  it("now() returns Date.now() + offset", () => {
    const conn = mockConnection();
    const clock = new Clock(conn);

    vi.setSystemTime(1000);
    expect(clock.now()).toBe(1000);
  });

  it("sync() estimates offset from multiple samples", async () => {
    const conn = mockConnection();
    const clock = new Clock(conn);

    let callCount = 0;
    vi.mocked(conn.sendAndWait).mockImplementation(async () => {
      callCount++;
      // Simulate server time being 100ms ahead with 10ms RTT
      const clientTime = Date.now();
      return {
        header: {
          id: `clock_${callCount}`,
          resource: "clock",
          method: "sync",
          kind: "response" as const,
          replyTo: `clock_${callCount}`,
        },
        payload: { serverTime: clientTime + 100 },
      };
    });

    vi.setSystemTime(1000);
    const offset = await clock.sync(3);

    expect(conn.sendAndWait).toHaveBeenCalledTimes(3);
    // With 0ms RTT in mock, offset should be ~100
    expect(offset).toBe(100);
    expect(clock.offset).toBe(100);
  });

  it("at() schedules callback at server time", () => {
    const conn = mockConnection();
    const clock = new Clock(conn);
    // Simulate offset of +100ms (server is 100ms ahead)
    (clock as any)._offset = 100;

    vi.setSystemTime(1000);

    const callback = vi.fn();
    clock.at(1200, callback); // server time 1200 = local time 1100

    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
