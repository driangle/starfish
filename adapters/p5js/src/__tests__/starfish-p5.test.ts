import { describe, it, expect, vi, beforeEach } from "vitest";
import { StarfishP5 } from "../starfish-p5.js";
import { Observable, EventStream } from "@driangle/starfish-client";
import type { StarfishFrame, DataResult } from "@driangle/starfish-client";

function createMockClient() {
  const connection$ = new Observable<string>("disconnected");
  const presence$ = new Observable<Map<string, any>>(new Map());
  const changed$ = new EventStream<DataResult>();
  const clients$ = new Observable<any[]>([]);
  const peers$ = new Observable<any[]>([]);
  const presence = { set: vi.fn(), clear: vi.fn() } as any;

  const topicStreams = new Map<string, EventStream<StarfishFrame>>();
  const keyStreams = new Map<string, EventStream<DataResult>>();

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
    save: vi.fn(async () => ({
      key: "",
      scope: "session",
      data: null,
      version: 1,
    })),
    get: vi.fn(async () => ({
      key: "",
      scope: "session",
      data: null,
      version: 1,
    })),
    key$: vi.fn((key: string) => {
      if (!keyStreams.has(key)) keyStreams.set(key, new EventStream());
      return keyStreams.get(key)!;
    }),
    on: vi.fn(() => () => {}),
    _topicStreams: topicStreams,
    _keyStreams: keyStreams,
  };
}

function createStarfishP5(mockClient: ReturnType<typeof createMockClient>) {
  const sf = new StarfishP5({ url: "ws://test", session: "test-session" });
  // Replace the internal client with our mock
  (sf as any).client = mockClient;
  // Re-subscribe observables to mock
  (sf as any).subscriptions = [];
  (sf as any).subscriptions.push(
    mockClient.connection$.subscribe((state: string) => {
      (sf as any)._connected = state === "connected";
    }),
  );
  (sf as any).subscriptions.push(
    mockClient.presence$.subscribe((presenceMap: Map<string, any>) => {
      const peers: any[] = [];
      for (const [id, data] of presenceMap) {
        if (id === mockClient.clientId) continue;
        peers.push({ id, name: data?.name, presence: data ?? {} });
      }
      (sf as any)._peers = peers;
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

describe("StarfishP5", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let sf: StarfishP5;

  beforeEach(() => {
    mockClient = createMockClient();
    sf = createStarfishP5(mockClient);
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
      sf.on("chat", cb);

      await sf.start();

      expect(mockClient.subscribe).toHaveBeenCalledWith("chat");
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
          ["test-client-id", { status: "idle" }],
          ["peer-1", { x: 100, y: 200, name: "Alice" }],
        ]),
      );

      expect(sf.peers).toHaveLength(1);
      expect(sf.peers[0].id).toBe("peer-1");
      expect(sf.peers[0].name).toBe("Alice");
      expect(sf.peers[0].presence).toEqual({ x: 100, y: 200, name: "Alice" });
    });
  });

  describe("eachPeer", () => {
    it("iterates over all peers", async () => {
      await sf.start();

      mockClient.presence$.set(
        new Map([
          ["peer-1", { status: "active" }],
          ["peer-2", { status: "idle" }],
        ]),
      );

      const ids: string[] = [];
      sf.eachPeer((peer) => ids.push(peer.id));

      expect(ids).toEqual(["peer-1", "peer-2"]);
    });
  });

  describe("setPresence", () => {
    it("broadcasts exactly what the user passes", async () => {
      await sf.start();
      sf.setPresence({ x: 10, y: 20, color: "red" });

      expect(mockClient.presence.set).toHaveBeenCalledWith({ x: 10, y: 20, color: "red" });
    });

    it("throttles updates", async () => {
      const throttled = new StarfishP5({
        url: "ws://test",
        session: "s",
        presence: { throttleMs: 1000 },
      });
      (throttled as any).client = mockClient;
      (throttled as any)._connected = true;

      await throttled.start();
      throttled.setPresence({ a: 1 });
      throttled.setPresence({ a: 2 });
      throttled.setPresence({ a: 3 });

      expect(mockClient.presence.set).toHaveBeenCalledTimes(1);
      expect(mockClient.presence.set).toHaveBeenCalledWith({ a: 1 });
    });
  });

  describe("on/emit", () => {
    it("subscribes to topics and receives messages", async () => {
      const cb = vi.fn();
      await sf.start();
      sf.on("draw", cb);

      // Wait for async subscribe
      await vi.waitFor(() => expect(mockClient.subscribe).toHaveBeenCalledWith("draw"));

      // Simulate incoming message
      mockClient._topicStreams.get("draw")!.emit({
        v: 1,
        id: "msg_1",
        type: "topic.message",
        topic: "draw",
        from: "peer-1",
        payload: { x: 10, y: 20 },
      });

      expect(cb).toHaveBeenCalledWith({ x: 10, y: 20 }, "peer-1");
    });

    it("publishes to topics", async () => {
      await sf.start();
      sf.emit("draw", { x: 1, y: 2 });

      expect(mockClient.publish).toHaveBeenCalledWith("draw", { x: 1, y: 2 });
    });
  });

  describe("shared data", () => {
    it("setShared saves session-scoped data", async () => {
      await sf.start();
      await sf.setShared("color", "red");

      expect(mockClient.save).toHaveBeenCalledWith({
        key: "color",
        scope: "session",
        op: "replace",
        data: "red",
      });
    });

    it("getShared returns cached data", async () => {
      await sf.start();

      mockClient.changed$.emit({
        key: "score",
        scope: "session",
        data: 42,
        version: 1,
      });

      expect(sf.getShared("score")).toBe(42);
    });

    it("onShared watches key changes", async () => {
      await sf.start();
      const cb = vi.fn();
      sf.onShared("bg", cb);

      mockClient._keyStreams.get("bg")!.emit({
        key: "bg",
        scope: "session",
        data: { r: 255, g: 0, b: 0 },
        version: 1,
      });

      expect(cb).toHaveBeenCalledWith({ r: 255, g: 0, b: 0 });
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
      sf.broadcast({ msg: "hello all" });

      expect(mockClient.broadcast).toHaveBeenCalledWith({ msg: "hello all" });
    });
  });

  describe("clientId", () => {
    it("returns client id from underlying client", () => {
      expect(sf.clientId).toBe("test-client-id");
    });
  });
});
