import { describe, it, expect } from "vitest";
import { StarfishError } from "./types.js";

describe("StarfishError", () => {
  it("is an instance of Error", () => {
    const err = new StarfishError("NOT_CONNECTED", "Not connected");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StarfishError);
  });

  it("carries the correct code and message", () => {
    const err = new StarfishError("REQUEST_TIMEOUT", "Request timed out");
    expect(err.code).toBe("REQUEST_TIMEOUT");
    expect(err.message).toBe("Request timed out");
    expect(err.name).toBe("StarfishError");
  });

  it("carries optional details", () => {
    const details = { code: "session.not_found", details: { id: "abc" } };
    const err = new StarfishError("SERVER_ERROR", "Session not found", details);
    expect(err.details).toEqual(details);
  });

  it("has no details when omitted", () => {
    const err = new StarfishError("NO_SESSION", "Not in a session");
    expect(err.details).toBeUndefined();
  });

  it("has a stack trace", () => {
    const err = new StarfishError("NOT_CONNECTED", "Not connected");
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("StarfishError");
  });

  it("works with try/catch", () => {
    try {
      throw new StarfishError("VALIDATION_ERROR", "Invalid data");
    } catch (err) {
      expect(err).toBeInstanceOf(StarfishError);
      expect((err as StarfishError).code).toBe("VALIDATION_ERROR");
    }
  });
});
