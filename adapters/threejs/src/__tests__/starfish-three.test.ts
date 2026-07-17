import { describe, it, expect, vi, beforeEach } from "vitest";
import { StarfishThree } from "../starfish-three.js";
import { Observable, EventStream } from "@driangle/starfish-client";
import type { StarfishFrame, DataResult, PoolMatchedEvent } from "@driangle/starfish-client";

function createMockClient() {
  const connection$ = new Observable<string>("disconnected");
  const presence$ = new Observable<Map<string, any>>(new Map());
  const changed$ = new EventStream<DataResult>();
  const clients$ = new Observable<any[]>([]);
  const peers$ = new Observable<any[]>([]);
  const presence = { set: vi.fn(), clear: vi.fn() } as any;

  const topicStreams = new Map<string, EventStream<StarfishFrame>>();
  const keyStreams = new Map<string, EventStream<DataResult>>();
  const poolMatched$ = new EventStream<PoolMatchedEvent>();

  return {
    connection$,
    presence$,
    changed$,
    clients$,
    peers$,
    presence,
    clientId: "test-client-id",
    connect: vi.fn(async () => {
      connection$.set("connected");
    }),
    disconnect: vi.fn(async () => {
      connection$.set("disconnected");
    }),
    join: vi.fn(async () => ({})),
    leave: vi.fn(async () => {}),
    subscribe: vi.fn(async () => ({})),
    unsubscribe: vi.fn(async () => {}),
    publish: vi.fn(),
    topic$: vi.fn((topic: string) => {
      if (!topicStreams.has(topic)) topicStreams.set(topic, new EventStream());
      return topicStreams.get(topic)!;
    }),
    send: vi.fn(),
    broadcast: vi.fn(),
    save: vi.fn(async () => ({ key: "", scope: "session", data: null, version: 1 })),
    get: vi.fn(async () => ({ key: "", scope: "session", data: null, version: 1 })),
    key$: vi.fn((key: string) => {
      if (!keyStreams.has(key)) keyStreams.set(key, new EventStream());
      return keyStreams.get(key)!;
    }),
    on: vi.fn(() => () => {}),
    pool: {
      enter: vi.fn(async () => ({})),
      leave: vi.fn(),
      matched$: poolMatched$,
    },
    _topicStreams: topicStreams,
    _keyStreams: keyStreams,
    _poolMatched$: poolMatched$,
  };
}

function createStarfishThree(mockClient: ReturnType<typeof createMockClient>) {
  const sf = new StarfishThree({ url: "ws://test", session: "test-session" });
  (sf as any).client = mockClient;
  (sf as any).subscriptions = [];
  (sf as any).subscriptions.push(
    mockClient.connection$.subscribe((state: string) => {
      (sf as any)._connected = state === "connected";
    }),
  );
  (sf as any).subscriptions.push(
    mockClient.presence$.subscribe((presenceMap: Map<string, any>) => {
      (sf as any)._peers = (sf as any).peerManager.update(presenceMap, mockClient.clientId);
    }),
  );
  (sf as any).subscriptions.push(
    mockClient.changed$.subscribe((result: DataResult) => {
      if (result.scope === "session") {
        (sf as any).sharedCache.set(result.key, result.data);
      }
    }),
  );
  return sf;
}

describe("StarfishThree", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let sf: StarfishThree;

  beforeEach(() => {
    mockClient = createMockClient();
    sf = createStarfishThree(mockClient);
  });

  describe("start", () => {
    it("connects and joins session", async () => {
      await sf.start();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.join).toHaveBeenCalledWith("test-session");
    });

    it("sets connected to true after start", async () => {
      expect(sf.connected).toBe(false);
      await sf.start();
      expect(sf.connected).toBe(true);
    });

    it("processes pending topic subscriptions", async () => {
      const cb = vi.fn();
      sf.on("events", cb);
      await sf.start();
      expect(mockClient.subscribe).toHaveBeenCalledWith("events");
    });
  });

  describe("stop", () => {
    it("disconnects the client", async () => {
      await sf.start();
      await sf.stop();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe("peers", () => {
    it("returns peers from presence map", async () => {
      await sf.start();
      mockClient.presence$.set(
        new Map([
          ["test-client-id", { pos: [0, 0, 0] }],
          ["peer-1", { pos: [1, 2, 3], name: "Alice" }],
        ]),
      );

      expect(sf.peers).toHaveLength(1);
      expect(sf.peers[0].id).toBe("peer-1");
      expect(sf.peers[0].presence).toEqual({ pos: [1, 2, 3], name: "Alice" });
    });
  });

  describe("setPresence", () => {
    it("broadcasts presence data", async () => {
      await sf.start();
      sf.setPresence({ pos: [1, 2, 3] });
      expect(mockClient.presence.set).toHaveBeenCalledWith({ pos: [1, 2, 3] });
    });

    it("throttles rapid calls", async () => {
      await sf.start();
      sf.setPresence({ pos: [1, 0, 0] });
      sf.setPresence({ pos: [2, 0, 0] });
      sf.setPresence({ pos: [3, 0, 0] });
      expect(mockClient.presence.set).toHaveBeenCalledTimes(1);
    });
  });

  describe("on/emit", () => {
    it("subscribes to topics and receives messages", async () => {
      const cb = vi.fn();
      await sf.start();
      sf.on("moves", cb);

      await vi.waitFor(() => expect(mockClient.subscribe).toHaveBeenCalledWith("moves"));

      mockClient._topicStreams.get("moves")!.emit({
        v: 1,
        id: "msg_1",
        type: "topic.message",
        topic: "moves",
        from: "peer-1",
        payload: { dx: 1, dy: 0 },
      });

      expect(cb).toHaveBeenCalledWith({ dx: 1, dy: 0 }, "peer-1");
    });

    it("publishes to topics", async () => {
      await sf.start();
      sf.emit("moves", { dx: 1 });
      expect(mockClient.publish).toHaveBeenCalledWith("moves", { dx: 1 });
    });
  });

  describe("stream", () => {
    it("publishes with unreliable RTC delivery options", async () => {
      await sf.start();
      sf.stream("pose", { head: [0, 1, 0] });

      expect(mockClient.publish).toHaveBeenCalledWith(
        "pose",
        { head: [0, 1, 0] },
        {
          delivery: {
            reliability: "unreliable",
            ordering: "unordered",
            preferTransport: "rtc",
          },
        },
      );
    });
  });

  describe("shared data", () => {
    it("setShared saves session-scoped data", async () => {
      await sf.start();
      await sf.setShared("scene", { objects: [] });

      expect(mockClient.save).toHaveBeenCalledWith({
        key: "scene",
        scope: "session",
        op: "replace",
        data: { objects: [] },
      });
    });

    it("getShared returns cached data", async () => {
      await sf.start();
      mockClient.changed$.emit({ key: "bg", scope: "session", data: "#fff", version: 1 });
      expect(sf.getShared("bg")).toBe("#fff");
    });

    it("onShared watches key changes", async () => {
      await sf.start();
      const cb = vi.fn();
      sf.onShared("bg", cb);

      mockClient._keyStreams.get("bg")!.emit({
        key: "bg",
        scope: "session",
        data: "blue",
        version: 1,
      });

      expect(cb).toHaveBeenCalledWith("blue");
    });
  });

  describe("messaging", () => {
    it("sendTo delegates to client.send", async () => {
      await sf.start();
      sf.sendTo("peer-1", { msg: "hi" });
      expect(mockClient.send).toHaveBeenCalledWith("peer-1", { msg: "hi" });
    });

    it("broadcast delegates to client.broadcast", async () => {
      await sf.start();
      sf.broadcast({ msg: "hello" });
      expect(mockClient.broadcast).toHaveBeenCalledWith({ msg: "hello" });
    });
  });

  describe("clientId", () => {
    it("returns client id from underlying client", () => {
      expect(sf.clientId).toBe("test-client-id");
    });
  });

  describe("joinPool", () => {
    it("calls client.pool.enter with defaults and provided options", async () => {
      await sf.start();
      await sf.joinPool("lobby", {}, vi.fn());

      expect(mockClient.pool.enter).toHaveBeenCalledWith("lobby", {
        create: true,
        groupSize: 2,
        mode: "auto",
      });
    });

    it("passes custom groupSize and mode", async () => {
      await sf.start();
      await sf.joinPool(
        "lobby",
        { groupSize: 4, mode: "claim", attributes: { level: 5 } },
        vi.fn(),
      );

      expect(mockClient.pool.enter).toHaveBeenCalledWith("lobby", {
        create: true,
        groupSize: 4,
        mode: "claim",
        attributes: { level: 5 },
      });
    });

    it("invokes onMatch when the SDK fires a matched event", async () => {
      await sf.start();
      const onMatch = vi.fn();
      await sf.joinPool("lobby", {}, onMatch);

      mockClient._poolMatched$.emit({
        pool: "lobby",
        session: "session-123",
        peers: [{ id: "peer-1" }, { id: "peer-2" }],
      });

      expect(onMatch).toHaveBeenCalledWith({
        pool: "lobby",
        peers: ["peer-1", "peer-2"],
        session: "session-123",
      });
    });

    it("ignores matched events for other pools", async () => {
      await sf.start();
      const onMatch = vi.fn();
      await sf.joinPool("lobby", {}, onMatch);

      mockClient._poolMatched$.emit({
        pool: "other-pool",
        session: "session-456",
        peers: [{ id: "peer-3" }],
      });

      expect(onMatch).not.toHaveBeenCalled();
    });
  });

  describe("leavePool", () => {
    it("calls client.pool.leave", async () => {
      await sf.start();
      await sf.leavePool("lobby");

      expect(mockClient.pool.leave).toHaveBeenCalledWith("lobby");
    });
  });

  describe("pool cleanup on stop", () => {
    it("removes pool subscriptions when stop is called", async () => {
      await sf.start();
      const onMatch = vi.fn();
      await sf.joinPool("lobby", {}, onMatch);

      await sf.stop();

      // Emit after stop — callback should not fire
      mockClient._poolMatched$.emit({
        pool: "lobby",
        session: "session-789",
        peers: [{ id: "peer-4" }],
      });

      expect(onMatch).not.toHaveBeenCalled();
    });
  });
});
