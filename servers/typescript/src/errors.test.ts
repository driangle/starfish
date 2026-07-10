import { describe, it, expect } from "vitest";
import { IDGenerator } from "./id.js";
import {
  createErrorFrame,
  ERR_AUTH_REQUIRED,
  ERR_AUTH_FAILED,
  ERR_SESSION_NOT_FOUND,
  ERR_SESSION_FULL,
  ERR_CLIENT_NOT_FOUND,
  ERR_TOPIC_INVALID,
  ERR_TOPIC_NOT_SUBSCRIBED,
  ERR_TRANSPORT_UNAVAILABLE,
  ERR_RTC_FAILED,
  ERR_DATA_INVALID_OP,
  ERR_DATA_CONFLICT,
  ERR_DATA_FORBIDDEN,
  ERR_RATE_LIMITED,
  ERR_PAYLOAD_TOO_LARGE,
  ERR_PROTOCOL_INVALID_FRAME,
  ERR_PROTOCOL_UNSUPPORTED_VERSION,
  ERR_RESUME_INVALID,
  ERR_RESUME_EXPIRED,
  ERR_INTERNAL_ERROR,
} from "./errors.js";

const ALL_CODES = [
  ERR_AUTH_REQUIRED,
  ERR_AUTH_FAILED,
  ERR_SESSION_NOT_FOUND,
  ERR_SESSION_FULL,
  ERR_CLIENT_NOT_FOUND,
  ERR_TOPIC_INVALID,
  ERR_TOPIC_NOT_SUBSCRIBED,
  ERR_TRANSPORT_UNAVAILABLE,
  ERR_RTC_FAILED,
  ERR_DATA_INVALID_OP,
  ERR_DATA_CONFLICT,
  ERR_DATA_FORBIDDEN,
  ERR_RATE_LIMITED,
  ERR_PAYLOAD_TOO_LARGE,
  ERR_PROTOCOL_INVALID_FRAME,
  ERR_PROTOCOL_UNSUPPORTED_VERSION,
  ERR_RESUME_INVALID,
  ERR_RESUME_EXPIRED,
  ERR_INTERNAL_ERROR,
];

describe("createErrorFrame", () => {
  it("creates a valid error frame", () => {
    const gen = new IDGenerator();
    const frame = createErrorFrame(gen, "msg_1", ERR_AUTH_REQUIRED);

    expect(frame.v).toBe(1);
    expect(frame.type).toBe("error");
    expect(frame.replyTo).toBe("msg_1");
    expect(frame.id).toBe("srv_1");
    expect(frame.error).toBeDefined();
    expect(frame.error!.code).toBe("auth.required");
    expect(frame.error!.message).toBe("Authentication required.");
  });

  it("includes details when provided", () => {
    const gen = new IDGenerator();
    const details = { maxSize: 65536 };
    const frame = createErrorFrame(gen, "msg_1", ERR_PAYLOAD_TOO_LARGE, details);

    expect(frame.error!.details).toEqual({ maxSize: 65536 });
  });

  it("omits details when not provided", () => {
    const gen = new IDGenerator();
    const frame = createErrorFrame(gen, "msg_1", ERR_AUTH_REQUIRED);

    expect(frame.error).not.toHaveProperty("details");
  });

  it("handles unknown error codes", () => {
    const gen = new IDGenerator();
    const frame = createErrorFrame(gen, "msg_1", "unknown.code");

    expect(frame.error!.message).toBe("Unknown error.");
  });

  it("all 19 error codes produce valid messages", () => {
    expect(ALL_CODES).toHaveLength(19);

    const gen = new IDGenerator();
    for (const code of ALL_CODES) {
      const frame = createErrorFrame(gen, "msg_1", code);
      expect(frame.error!.code).toBe(code);
      expect(frame.error!.message).not.toBe("Unknown error.");
      expect(frame.error!.message.length).toBeGreaterThan(0);
    }
  });

  it("assigns unique IDs to each error frame", () => {
    const gen = new IDGenerator();
    const frame1 = createErrorFrame(gen, "msg_1", ERR_AUTH_REQUIRED);
    const frame2 = createErrorFrame(gen, "msg_2", ERR_AUTH_FAILED);

    expect(frame1.id).not.toBe(frame2.id);
  });
});
