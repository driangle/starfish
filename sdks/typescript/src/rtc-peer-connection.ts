import type {
  StarfishFrame,
  RTCOptions,
  RTCPeerConnectionLike,
  RTCDataChannelLike,
  PeerEntry,
} from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { EventStream } from "./emitter.js";
import { MAX_RTC_CONTROL_SIZE, MAX_RTC_STREAM_SIZE } from "./limits.js";

export const CHANNEL_CONFIGS: Record<string, { label: string; opts: any }> = {
  control: { label: "starfish.control", opts: { ordered: true } },
  stream: {
    label: "starfish.stream",
    opts: { ordered: false, maxRetransmits: 0 },
  },
  state: { label: "starfish.state", opts: { ordered: true } },
};

export const CHANNEL_SIZE_LIMITS: Record<string, number> = {
  "starfish.control": MAX_RTC_CONTROL_SIZE,
  "starfish.stream": MAX_RTC_STREAM_SIZE,
  "starfish.state": MAX_RTC_CONTROL_SIZE,
};

export function createPeerConnection(opts: {
  peerId: string;
  connection: Connection;
  session: Session;
  rtcOptions: RTCOptions;
  peers: Map<string, PeerEntry>;
  frames$: EventStream<StarfishFrame>;
  updatePeers: () => void;
}): RTCPeerConnectionLike {
  const { peerId, connection, session, rtcOptions, peers, updatePeers } = opts;

  const config = rtcOptions.iceServers ? { iceServers: rtcOptions.iceServers } : undefined;

  const pc = rtcOptions.factory(config);

  pc.onicecandidate = (ev) => {
    if (!ev.candidate) return;
    const sessionName = session.current;
    if (!sessionName) return;

    connection.send({
      header: {
        id: nextId("rtc"),
        resource: "rtc",
        method: "ice",
        kind: "event",
        session: sessionName,
        to: peerId,
      },
      payload: { candidate: ev.candidate },
    });
  };

  pc.onconnectionstatechange = () => {
    const entry = peers.get(peerId);
    if (!entry) return;

    const state = pc.connectionState;
    if (state === "connected") {
      entry.state = "connected";
      updatePeers();
      const sessionName = session.current;
      if (sessionName) {
        connection.send({
          header: {
            id: nextId("rtc"),
            resource: "rtc",
            method: "connected",
            kind: "event",
            session: sessionName,
            to: peerId,
          },
        });
      }
    } else if (state === "failed") {
      entry.state = "failed";
      updatePeers();
      const sessionName = session.current;
      if (sessionName) {
        connection.send({
          header: {
            id: nextId("rtc"),
            resource: "rtc",
            method: "disconnected",
            kind: "event",
            session: sessionName,
            to: peerId,
          },
          payload: { reason: "ice_failed" },
        });
      }
      entry.pc.close();
      peers.delete(peerId);
      updatePeers();
    } else if (state === "disconnected" || state === "closed") {
      entry.pc.close();
      peers.delete(peerId);
      updatePeers();
    }
  };

  return pc;
}

export function setupDataChannel(opts: {
  peerId: string;
  dc: RTCDataChannelLike;
  peers: Map<string, PeerEntry>;
  frames$: EventStream<StarfishFrame>;
}): void {
  const { peerId, dc, peers, frames$ } = opts;

  dc.onmessage = (ev) => {
    const data = typeof ev.data === "string" ? ev.data : String(ev.data);
    const limit = CHANNEL_SIZE_LIMITS[dc.label] ?? MAX_RTC_CONTROL_SIZE;
    const size = new TextEncoder().encode(data).byteLength;
    if (size > limit) return;

    const frame: StarfishFrame = JSON.parse(data);
    frames$.emit(frame);
  };

  dc.onclose = () => {
    const entry = peers.get(peerId);
    if (entry) {
      entry.channels.delete(dc.label);
    }
  };
}
