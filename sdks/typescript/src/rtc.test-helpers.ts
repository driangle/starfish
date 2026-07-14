import { vi } from "vitest";
import type { StarfishFrame, RTCPeerConnectionLike, RTCDataChannelLike } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";

export function createMockDataChannel(label: string): RTCDataChannelLike & {
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

export function createMockPeerConnection(): RTCPeerConnectionLike & {
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
    createDataChannel(label: string, _opts?: any) {
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

export function createMockConnection(): Connection & {
  sentFrames: StarfishFrame[];
} {
  const sentFrames: StarfishFrame[] = [];
  return {
    clientId: "client_self",
    send(frame: StarfishFrame) {
      sentFrames.push(frame);
    },
    sentFrames,
  } as any;
}

export function createMockSession(current: string | null = "test-session"): Session {
  return {
    current,
    clientId: "client_self",
    require: () => {
      if (!current) throw new Error("Not in a session. Call join() first.");
      return current;
    },
  } as any;
}
