import { describe, it, expect, vi, beforeEach } from "vitest";
import { RTC } from "./rtc.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import type {
  StarfishFrame,
  RTCOptions,
  RTCPeerConnectionLike,
  RTCDataChannelLike,
  RTCSessionDescriptionLike,
} from "./types.js";

// --- Mock factories ---

function createMockDataChannel(label: string): RTCDataChannelLike & {
  _triggerMessage: (data: string) => void;
  _triggerOpen: () => void;
  _triggerClose: () => void;
} {
  const dc: any = {
    label,
    readyState: "connecting",
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    _triggerMessage(data: string) {
      dc.onmessage?.({ data });
    },
    _triggerOpen() {
      dc.readyState = "open";
      dc.onopen?.({});
    },
    _triggerClose() {
      dc.readyState = "closed";
      dc.onclose?.({});
    },
  };
  return dc;
}

function createMockPeerConnection(): RTCPeerConnectionLike & {
  _channels: Map<string, ReturnType<typeof createMockDataChannel>>;
  _triggerConnectionState: (state: string) => void;
  _triggerDataChannel: (channel: RTCDataChannelLike) => void;
  _triggerIceCandidate: (candidate: any) => void;
} {
  const channels = new Map<string, ReturnType<typeof createMockDataChannel>>();

  const pc: any = {
    connectionState: "new",
    _channels: channels,
    createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "mock-offer-sdp" }),
    createAnswer: vi.fn().mockResolvedValue({ type: "answer", sdp: "mock-answer-sdp" }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    createDataChannel(label: string, opts?: any) {
      const dc = createMockDataChannel(label);
      channels.set(label, dc);
      return dc;
    },
    close: vi.fn(),
    onicecandidate: null,
    ondatachannel: null,
    onconnectionstatechange: null,
    _triggerConnectionState(state: string) {
      pc.connectionState = state;
      pc.onconnectionstatechange?.({});
    },
    _triggerDataChannel(channel: RTCDataChannelLike) {
      pc.ondatachannel?.({ channel });
    },
    _triggerIceCandidate(candidate: any) {
      pc.onicecandidate?.({ candidate });
    },
  };
  return pc;
}

function createMockConnection(): Connection & { sentFrames: StarfishFrame[] } {
  const sentFrames: StarfishFrame[] = [];
  return {
    clientId: "client_self",
    send(frame: StarfishFrame) {
      sentFrames.push(frame);
    },
    sentFrames,
  } as any;
}

function createMockSession(current: string | null = "test-session"): Session {
  return { current, clientId: "client_self" } as any;
}

// --- Tests ---

describe("RTC", () => {
  let mockPc: ReturnType<typeof createMockPeerConnection>;
  let connection: ReturnType<typeof createMockConnection>;
  let session: ReturnType<typeof createMockSession>;
  let rtcOptions: RTCOptions;
  let rtc: RTC;

  beforeEach(() => {
    mockPc = createMockPeerConnection();
    connection = createMockConnection();
    session = createMockSession();
    rtcOptions = {
      factory: vi.fn().mockReturnValue(mockPc),
      iceServers: [{ urls: "stun:stun.example.com" }],
    };
    rtc = new RTC(connection, session, rtcOptions);
  });

  describe("connect", () => {
    it("creates peer connection and sends rtc.connect + rtc.offer", async () => {
      await rtc.connect("peer_1");

      expect(rtcOptions.factory).toHaveBeenCalledWith({
        iceServers: [{ urls: "stun:stun.example.com" }],
      });

      const connectFrame = connection.sentFrames.find(
        (f) => f.type === "rtc.connect",
      );
      expect(connectFrame).toBeDefined();
      expect(connectFrame!.to).toBe("peer_1");
      expect(connectFrame!.payload.channels).toEqual([
        "control",
        "stream",
        "state",
      ]);

      const offerFrame = connection.sentFrames.find(
        (f) => f.type === "rtc.offer",
      );
      expect(offerFrame).toBeDefined();
      expect(offerFrame!.to).toBe("peer_1");
      expect(offerFrame!.payload.sdp).toBe("mock-offer-sdp");
    });

    it("creates all 3 DataChannels as initiator", async () => {
      await rtc.connect("peer_1");

      expect(mockPc._channels.has("starfish.control")).toBe(true);
      expect(mockPc._channels.has("starfish.stream")).toBe(true);
      expect(mockPc._channels.has("starfish.state")).toBe(true);
    });

    it("creates only requested channels", async () => {
      await rtc.connect("peer_1", ["control"]);

      expect(mockPc._channels.has("starfish.control")).toBe(true);
      expect(mockPc._channels.has("starfish.stream")).toBe(false);
      expect(mockPc._channels.has("starfish.state")).toBe(false);
    });

    it("sets peer state to connecting", async () => {
      await rtc.connect("peer_1");

      expect(rtc.getPeerState("peer_1")).toBe("connecting");
      expect(rtc.rtcPeers$.value).toEqual([
        expect.objectContaining({ peerId: "peer_1", state: "connecting" }),
      ]);
    });

    it("throws if not in a session", async () => {
      const noSessionRtc = new RTC(
        connection,
        createMockSession(null),
        rtcOptions,
      );
      await expect(noSessionRtc.connect("peer_1")).rejects.toThrow(
        "Not in a session",
      );
    });
  });

  describe("incoming signaling", () => {
    it("handles rtc.connect by creating peer connection as responder", () => {
      rtc.handleFrame({
        v: 1,
        id: "rtc_001",
        type: "rtc.connect",
        from: "peer_1",
        session: "test-session",
        payload: { channels: ["control", "stream", "state"] },
      });

      expect(rtc.hasPeer("peer_1")).toBe(true);
      expect(rtc.getPeerState("peer_1")).toBe("connecting");
    });

    it("handles rtc.offer by setting remote description and sending answer", async () => {
      // First receive connect
      rtc.handleFrame({
        v: 1,
        id: "rtc_001",
        type: "rtc.connect",
        from: "peer_1",
        session: "test-session",
        payload: { channels: ["control"] },
      });

      // Then receive offer
      rtc.handleFrame({
        v: 1,
        id: "rtc_002",
        type: "rtc.offer",
        from: "peer_1",
        session: "test-session",
        payload: { sdp: "remote-offer-sdp" },
      });

      // Wait for async processing
      await vi.waitFor(() => {
        const answerFrame = connection.sentFrames.find(
          (f) => f.type === "rtc.answer",
        );
        expect(answerFrame).toBeDefined();
      });

      expect(mockPc.setRemoteDescription).toHaveBeenCalledWith({
        type: "offer",
        sdp: "remote-offer-sdp",
      });

      const answerFrame = connection.sentFrames.find(
        (f) => f.type === "rtc.answer",
      );
      expect(answerFrame!.payload.sdp).toBe("mock-answer-sdp");
      expect(answerFrame!.to).toBe("peer_1");
    });

    it("handles rtc.answer by setting remote description", async () => {
      await rtc.connect("peer_1");

      rtc.handleFrame({
        v: 1,
        id: "rtc_003",
        type: "rtc.answer",
        from: "peer_1",
        session: "test-session",
        payload: { sdp: "remote-answer-sdp" },
      });

      await vi.waitFor(() => {
        expect(mockPc.setRemoteDescription).toHaveBeenCalledWith({
          type: "answer",
          sdp: "remote-answer-sdp",
        });
      });
    });

    it("handles rtc.ice by adding ICE candidate", async () => {
      await rtc.connect("peer_1");

      const candidate = {
        candidate: "candidate:123",
        sdpMid: "0",
        sdpMLineIndex: 0,
      };

      rtc.handleFrame({
        v: 1,
        id: "rtc_004",
        type: "rtc.ice",
        from: "peer_1",
        session: "test-session",
        payload: { candidate },
      });

      await vi.waitFor(() => {
        expect(mockPc.addIceCandidate).toHaveBeenCalledWith(candidate);
      });
    });
  });

  describe("ICE candidate relay", () => {
    it("sends ICE candidates to peer via WS", async () => {
      await rtc.connect("peer_1");

      const candidate = {
        candidate: "candidate:456",
        sdpMid: "0",
        sdpMLineIndex: 0,
      };
      mockPc._triggerIceCandidate(candidate);

      const iceFrame = connection.sentFrames.find(
        (f) => f.type === "rtc.ice",
      );
      expect(iceFrame).toBeDefined();
      expect(iceFrame!.to).toBe("peer_1");
      expect(iceFrame!.payload.candidate).toEqual(candidate);
    });

    it("does not send when candidate is null (gathering complete)", async () => {
      await rtc.connect("peer_1");

      const framesBefore = connection.sentFrames.length;
      mockPc._triggerIceCandidate(null);

      const iceFrames = connection.sentFrames
        .slice(framesBefore)
        .filter((f) => f.type === "rtc.ice");
      expect(iceFrames).toHaveLength(0);
    });
  });

  describe("connection state", () => {
    it("updates to connected and sends rtc.connected", async () => {
      await rtc.connect("peer_1");

      mockPc._triggerConnectionState("connected");

      expect(rtc.getPeerState("peer_1")).toBe("connected");

      const connectedFrame = connection.sentFrames.find(
        (f) => f.type === "rtc.connected",
      );
      expect(connectedFrame).toBeDefined();
      expect(connectedFrame!.to).toBe("peer_1");
    });

    it("cleans up on failed and sends rtc.disconnected", async () => {
      await rtc.connect("peer_1");

      mockPc._triggerConnectionState("failed");

      expect(rtc.hasPeer("peer_1")).toBe(false);

      const disconnectedFrame = connection.sentFrames.find(
        (f) => f.type === "rtc.disconnected",
      );
      expect(disconnectedFrame).toBeDefined();
      expect(disconnectedFrame!.payload.reason).toBe("ice_failed");
    });

    it("handles incoming rtc.disconnected by cleaning up peer", async () => {
      await rtc.connect("peer_1");

      rtc.handleFrame({
        v: 1,
        id: "evt_071",
        type: "rtc.disconnected",
        from: "peer_1",
        session: "test-session",
        payload: { reason: "ice_failed" },
      });

      expect(rtc.hasPeer("peer_1")).toBe(false);
      expect(mockPc.close).toHaveBeenCalled();
    });
  });

  describe("DataChannel messaging", () => {
    it("sends frame over DataChannel", async () => {
      await rtc.connect("peer_1");

      const dc = mockPc._channels.get("starfish.control")!;
      dc._triggerOpen();

      const frame: StarfishFrame = {
        v: 1,
        id: "msg_001",
        type: "client.send",
        to: "peer_1",
        payload: { hello: "world" },
      };

      rtc.sendToPeer("peer_1", "starfish.control", frame);

      expect(dc.send).toHaveBeenCalledWith(JSON.stringify(frame));
    });

    it("receives frame from DataChannel and emits on frames$", async () => {
      await rtc.connect("peer_1");

      const dc = mockPc._channels.get("starfish.control")!;
      dc._triggerOpen();

      const received: StarfishFrame[] = [];
      rtc.frames$.subscribe((f) => received.push(f));

      const incomingFrame: StarfishFrame = {
        v: 1,
        id: "msg_002",
        type: "client.send",
        from: "peer_1",
        payload: { data: "test" },
      };
      dc._triggerMessage(JSON.stringify(incomingFrame));

      expect(received).toHaveLength(1);
      expect(received[0].payload).toEqual({ data: "test" });
      expect(received[0].transport).toBe("rtc");
    });

    it("throws when sending to non-existent peer", () => {
      expect(() =>
        rtc.sendToPeer("unknown", "starfish.control", {
          v: 1,
          id: "x",
          type: "test",
        }),
      ).toThrow("No RTC connection to peer: unknown");
    });

    it("throws when channel is not open", async () => {
      await rtc.connect("peer_1");

      // Channel is still in "connecting" state
      expect(() =>
        rtc.sendToPeer("peer_1", "starfish.control", {
          v: 1,
          id: "x",
          type: "test",
        }),
      ).toThrow("DataChannel starfish.control not open");
    });
  });

  describe("payload size validation", () => {
    it("validates control channel size limit", async () => {
      await rtc.connect("peer_1");

      const dc = mockPc._channels.get("starfish.control")!;
      dc._triggerOpen();

      const largePayload = "x".repeat(65 * 1024);
      expect(() =>
        rtc.sendToPeer("peer_1", "starfish.control", {
          v: 1,
          id: "x",
          type: "test",
          payload: largePayload,
        }),
      ).toThrow("exceeds size limit");
    });

    it("silently drops oversized incoming messages", async () => {
      await rtc.connect("peer_1");

      const dc = mockPc._channels.get("starfish.stream")!;
      dc._triggerOpen();

      const received: StarfishFrame[] = [];
      rtc.frames$.subscribe((f) => received.push(f));

      const largeData = JSON.stringify({
        v: 1,
        id: "x",
        type: "test",
        payload: "x".repeat(17 * 1024),
      });
      dc._triggerMessage(largeData);

      expect(received).toHaveLength(0);
    });
  });

  describe("disconnect", () => {
    it("closes peer connection and removes peer", async () => {
      await rtc.connect("peer_1");

      rtc.disconnect("peer_1");

      expect(mockPc.close).toHaveBeenCalled();
      expect(rtc.hasPeer("peer_1")).toBe(false);
      expect(rtc.rtcPeers$.value).toEqual([]);
    });

    it("sends rtc.disconnected to peer", async () => {
      await rtc.connect("peer_1");

      rtc.disconnect("peer_1");

      const disconnectedFrame = connection.sentFrames.find(
        (f) => f.type === "rtc.disconnected",
      );
      expect(disconnectedFrame).toBeDefined();
      expect(disconnectedFrame!.payload.reason).toBe("local_close");
    });

    it("is a no-op for unknown peer", () => {
      expect(() => rtc.disconnect("unknown")).not.toThrow();
    });
  });

  describe("closeAll", () => {
    it("closes all peer connections", async () => {
      const mockPc2 = createMockPeerConnection();
      let callCount = 0;
      (rtcOptions.factory as any).mockImplementation(() => {
        return callCount++ === 0 ? mockPc : mockPc2;
      });

      await rtc.connect("peer_1");
      await rtc.connect("peer_2");

      rtc.closeAll();

      expect(mockPc.close).toHaveBeenCalled();
      expect(mockPc2.close).toHaveBeenCalled();
      expect(rtc.rtcPeers$.value).toEqual([]);
    });
  });

  describe("rtcPeers$ observable", () => {
    it("emits peer info updates", async () => {
      const updates: any[] = [];
      rtc.rtcPeers$.subscribe((peers) => updates.push([...peers]));

      await rtc.connect("peer_1");

      expect(updates.length).toBeGreaterThanOrEqual(1);
      const last = updates[updates.length - 1];
      expect(last).toEqual([
        { peerId: "peer_1", state: "connecting", channels: expect.any(Array) },
      ]);
    });
  });
});
