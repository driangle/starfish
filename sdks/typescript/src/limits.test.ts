import { describe, it, expect } from "vitest";
import {
  validatePayloadSize,
  validateTopicName,
  MAX_PRESENCE_SIZE,
  MAX_TOPIC_NAME_LENGTH,
} from "./limits.js";

describe("validatePayloadSize", () => {
  it("accepts payloads within limit", () => {
    expect(() =>
      validatePayloadSize('{"x":1}', MAX_PRESENCE_SIZE, "Test"),
    ).not.toThrow();
  });

  it("rejects payloads exceeding limit", () => {
    const large = "x".repeat(MAX_PRESENCE_SIZE + 1);
    expect(() =>
      validatePayloadSize(large, MAX_PRESENCE_SIZE, "Presence payload"),
    ).toThrow("exceeds size limit");
  });
});

describe("validateTopicName", () => {
  it("accepts valid topic names", () => {
    expect(() => validateTopicName("lights")).not.toThrow();
    expect(() => validateTopicName("a".repeat(128))).not.toThrow();
  });

  it("rejects topic names exceeding max length", () => {
    expect(() => validateTopicName("a".repeat(129))).toThrow(
      "exceeds 128 characters",
    );
  });
});
