import { describe, it, expect, beforeEach } from "vitest";
import { nextId, resetIdCounter } from "./id.js";

describe("nextId", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("generates sequential IDs with default prefix", () => {
    expect(nextId()).toBe("msg_1");
    expect(nextId()).toBe("msg_2");
    expect(nextId()).toBe("msg_3");
  });

  it("uses custom prefix", () => {
    expect(nextId("ping")).toBe("ping_1");
    expect(nextId("hello")).toBe("hello_2");
  });

  it("resets counter", () => {
    nextId();
    nextId();
    resetIdCounter();
    expect(nextId()).toBe("msg_1");
  });
});
