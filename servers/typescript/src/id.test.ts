import { describe, it, expect } from "vitest";
import { IDGenerator } from "./id.js";

describe("IDGenerator", () => {
  it("generates client IDs with correct format", () => {
    const gen = new IDGenerator();
    const id = gen.clientId();
    expect(id).toMatch(/^client_[0-9a-f]{8}$/);
  });

  it("generates unique client IDs", () => {
    const gen = new IDGenerator();
    const ids = new Set(Array.from({ length: 100 }, () => gen.clientId()));
    expect(ids.size).toBe(100);
  });

  it("generates resume tokens with correct format", () => {
    const gen = new IDGenerator();
    const token = gen.resumeToken();
    expect(token).toMatch(/^rt_[0-9a-f]{16}$/);
  });

  it("generates unique resume tokens", () => {
    const gen = new IDGenerator();
    const tokens = new Set(Array.from({ length: 100 }, () => gen.resumeToken()));
    expect(tokens.size).toBe(100);
  });

  it("generates incrementing message IDs", () => {
    const gen = new IDGenerator();
    expect(gen.messageId()).toBe("srv_1");
    expect(gen.messageId()).toBe("srv_2");
    expect(gen.messageId()).toBe("srv_3");
  });

  it("starts message ID counter at 1", () => {
    const gen = new IDGenerator();
    expect(gen.messageId()).toBe("srv_1");
  });

  it("maintains separate counters per instance", () => {
    const gen1 = new IDGenerator();
    const gen2 = new IDGenerator();
    expect(gen1.messageId()).toBe("srv_1");
    expect(gen2.messageId()).toBe("srv_1");
    expect(gen1.messageId()).toBe("srv_2");
  });
});
