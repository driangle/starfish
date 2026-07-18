import { describe, it, expect, vi, beforeEach } from "vitest";
import { RTC } from "./rtc.js";
import type { StarfishFrame, RTCOptions } from "./types.js";
import {
  createMockPeerConnection,
  createMockConnection,
  createMockSession,
} from "./rtc.test-helpers.js";

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
        (f) => f.header.method === "connect" && f.header.resource === "rtc",
      );
      expect(connectFrame).toBeDefined();
      expect(connectFrame!.header.to).toBe("peer_1");
      expect(connectFrame!.payload!.channels).toEqual(["control", "stream", "state"]);

      const offerFrame = connection.sentFrames.find(
        (f) => f.header.method === "offer" && f.header.resource === "rtc",
      );
      expect(offerFrame).toBeDefined();
      expect(offerFrame!.header.to).toBe("peer_1");
      expect(offerFrame!.payload!.sdp).toBe("mock-offer-sdp");
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
      const noSessionRtc = new RTC(connection, createMockSession(null), rtcOptions);
      await expect(noSessionRtc.connect("peer_1")).rejects.toThrow("Not in a session");
    });
  });

  describe("incoming signaling", () => {
    it("handles rtc.connect by creating peer connection as responder", () => {
      rtc.handleFrame({
        header: {
          id: "rtc_001",
          resource: "rtc",
          method: "connect",
          kind: "request",
          from: "peer_1",
          session: "test-session",
        },
        payload: { channels: ["control", "stream", "state"] },
      });

      expect(rtc.hasPeer("peer_1")).toBe(true);
      expect(rtc.getPeerState("peer_1")).toBe("connecting");
    });

    it("handles rtc.offer by setting remote description and sending answer", async () => {
      // First receive connect
      rtc.handleFrame({
        header: {
          id: "rtc_001",
          resource: "rtc",
          method: "connect",
          kind: "request",
          from: "peer_1",
          session: "test-session",
        },
        payload: { channels: ["control"] },
      });

      // Then receive offer
      rtc.handleFrame({
        header: {
          id: "rtc_002",
          resource: "rtc",
          method: "offer",
          kind: "event",
          from: "peer_1",
          session: "test-session",
        },
        payload: { sdp: "remote-offer-sdp" },
      });

      // Wait for async processing
      await vi.waitFor(() => {
        const answerFrame = connection.sentFrames.find(
          (f) => f.header.method === "answer" && f.header.resource === "rtc",
        );
        expect(answerFrame).toBeDefined();
      });

      expect(mockPc.setRemoteDescription).toHaveBeenCalledWith({
        type: "offer",
        sdp: "remote-offer-sdp",
      });

      const answerFrame = connection.sentFrames.find(
        (f) => f.header.method === "answer" && f.header.resource === "rtc",
      );
      expect(answerFrame!.payload!.sdp).toBe("mock-answer-sdp");
      expect(answerFrame!.header.to).toBe("peer_1");
    });

    it("handles rtc.answer by setting remote description", async () => {
      await rtc.connect("peer_1");

      rtc.handleFrame({
        header: {
          id: "rtc_003",
          resource: "rtc",
          method: "answer",
          kind: "event",
          from: "peer_1",
          session: "test-session",
        },
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
        header: {
          id: "rtc_004",
          resource: "rtc",
          method: "ice",
          kind: "event",
          from: "peer_1",
          session: "test-session",
        },
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
        (f) => f.header.method === "ice" && f.header.resource === "rtc",
      );
      expect(iceFrame).toBeDefined();
      expect(iceFrame!.header.to).toBe("peer_1");
      expect(iceFrame!.payload!.candidate).toEqual(candidate);
    });

    it("does not send when candidate is null (gathering complete)", async () => {
      await rtc.connect("peer_1");

      const framesBefore = connection.sentFrames.length;
      mockPc._triggerIceCandidate(null);

      const iceFrames = connection.sentFrames
        .slice(framesBefore)
        .filter((f) => f.header.method === "ice" && f.header.resource === "rtc");
      expect(iceFrames).toHaveLength(0);
    });
  });

  describe("connection state", () => {
    it("updates to connected and sends rtc.connected", async () => {
      await rtc.connect("peer_1");

      mockPc._triggerConnectionState("connected");

      expect(rtc.getPeerState("peer_1")).toBe("connected");

      const connectedFrame = connection.sentFrames.find(
        (f) => f.header.method === "connected" && f.header.resource === "rtc",
      );
      expect(connectedFrame).toBeDefined();
      expect(connectedFrame!.header.to).toBe("peer_1");
    });

    it("cleans up on failed and sends rtc.disconnected", async () => {
      await rtc.connect("peer_1");

      mockPc._triggerConnectionState("failed");

      expect(rtc.hasPeer("peer_1")).toBe(false);

      const disconnectedFrame = connection.sentFrames.find(
        (f) => f.header.method === "disconnected" && f.header.resource === "rtc",
      );
      expect(disconnectedFrame).toBeDefined();
      expect(disconnectedFrame!.payload!.reason).toBe("ice_failed");
    });

    it("handles incoming rtc.disconnected by cleaning up peer", async () => {
      await rtc.connect("peer_1");

      rtc.handleFrame({
        header: {
          id: "evt_071",
          resource: "rtc",
          method: "disconnected",
          kind: "event",
          from: "peer_1",
          session: "test-session",
        },
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
        header: {
          id: "msg_001",
          resource: "message",
          method: "send",
          kind: "request",
          to: "peer_1",
        },
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
        header: {
          id: "msg_002",
          resource: "message",
          method: "send",
          kind: "request",
          from: "peer_1",
        },
        payload: { data: "test" },
      };
      dc._triggerMessage(JSON.stringify(incomingFrame));

      expect(received).toHaveLength(1);
      expect(received[0].payload).toEqual({ data: "test" });
    });

    it("throws when sending to non-existent peer", () => {
      expect(() =>
        rtc.sendToPeer("unknown", "starfish.control", {
          header: {
            id: "x",
            resource: "test",
            method: "test",
            kind: "request",
          },
        }),
      ).toThrow("No RTC connection to peer: unknown");
    });

    it("throws when channel is not open", async () => {
      await rtc.connect("peer_1");

      // Channel is still in "connecting" state
      expect(() =>
        rtc.sendToPeer("peer_1", "starfish.control", {
          header: {
            id: "x",
            resource: "test",
            method: "test",
            kind: "request",
          },
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
          header: {
            id: "x",
            resource: "test",
            method: "test",
            kind: "request",
          },
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
        header: {
          id: "x",
          resource: "test",
          method: "test",
          kind: "request",
        },
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
        (f) => f.header.method === "disconnected" && f.header.resource === "rtc",
      );
      expect(disconnectedFrame).toBeDefined();
      expect(disconnectedFrame!.payload!.reason).toBe("local_close");
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
