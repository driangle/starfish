import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PendingRequests } from "./pending.js";
import { StarfishError, type StarfishFrame } from "./types.js";

describe("PendingRequests", () => {
  let pending: PendingRequests;

  beforeEach(() => {
    vi.useFakeTimers();
    pending = new PendingRequests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when matching reply arrives", async () => {
    const promise = pending.add("msg_1", 5000);

    const reply: StarfishFrame = {
      header: {
        id: "srv_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "msg_1",
      },
      payload: { clientId: "abc" },
    };

    expect(pending.resolve(reply)).toBe(true);
    await expect(promise).resolves.toEqual(reply);
  });

  it("rejects on error frame", async () => {
    const promise = pending.add("msg_2", 5000);

    const errorReply: StarfishFrame = {
      header: {
        id: "err_1",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "msg_2",
      },
      payload: {
        status: "error",
        error: {
          code: "session.not_found",
          resource: "session",
          message: "Session does not exist.",
          retry: false,
        },
      },
    };

    pending.resolve(errorReply);
    await expect(promise).rejects.toThrow("Session does not exist.");
    await expect(promise).rejects.toBeInstanceOf(StarfishError);
    await promise.catch((err) => {
      expect(err.code).toBe("session.not_found");
      expect(err.message).toBe("Session does not exist.");
      expect(err.resource).toBe("session");
      expect(err.retry).toBe(false);
      expect(err.details).toEqual(undefined);
    });
  });

  it("rejects on error frame with details in payload", async () => {
    const promise = pending.add("msg_2b", 5000);

    const errorReply: StarfishFrame = {
      header: {
        id: "err_2",
        resource: "session",
        method: "join",
        kind: "response",
        replyTo: "msg_2b",
      },
      payload: {
        status: "error",
        error: {
          code: "session.not_found",
          resource: "session",
          message: "Session does not exist.",
          retry: false,
        },
        details: { id: "abc" },
      },
    };

    pending.resolve(errorReply);
    await promise.catch((err) => {
      expect(err.details).toEqual({ id: "abc" });
    });
  });

  it("times out if no reply", async () => {
    const promise = pending.add("msg_3", 1000);

    vi.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow("timed out");
    await promise.catch((err) => {
      expect(err).toBeInstanceOf(StarfishError);
      expect(err.code).toBe("REQUEST_TIMEOUT");
    });
  });

  it("returns false for non-matching frame", () => {
    pending.add("msg_4", 5000);

    const unrelated: StarfishFrame = {
      header: {
        id: "evt_1",
        resource: "topic",
        method: "message",
        kind: "event",
      },
    };

    expect(pending.resolve(unrelated)).toBe(false);
  });

  it("returns false for frame without replyTo", () => {
    const frame: StarfishFrame = {
      header: {
        id: "evt_1",
        resource: "topic",
        method: "message",
        kind: "event",
      },
    };

    expect(pending.resolve(frame)).toBe(false);
  });

  it("rejects all pending on rejectAll", async () => {
    const p1 = pending.add("msg_5", 5000);
    const p2 = pending.add("msg_6", 5000);

    pending.rejectAll(new StarfishError("DISCONNECTED", "disconnected"));

    await expect(p1).rejects.toThrow("disconnected");
    await expect(p2).rejects.toThrow("disconnected");
  });
});
