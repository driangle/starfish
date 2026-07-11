import type {
  StarfishFrame,
  RTCPeerConnectionLike,
  RTCDataChannelLike,
  PeerEntry,
} from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { EventStream } from "./emitter.js";
import { createPeerConnection, setupDataChannel } from "./rtc-peer-connection.js";

const DEFAULT_CHANNELS = ["control", "stream", "state"];

export interface SignalingContext {
  connection: Connection;
  session: Session;
  rtcOptions: { factory: any; iceServers?: any[] };
  peers: Map<string, PeerEntry>;
  frames$: EventStream<StarfishFrame>;
  updatePeers: () => void;
  requireSession: () => string;
}

export function handleConnect(ctx: SignalingContext, frame: StarfishFrame): void {
  const peerId = frame.from;
  if (!peerId) return;

  const channels: string[] = frame.payload?.channels ?? DEFAULT_CHANNELS;

  const pc = createPeerConnection({ peerId, ...ctx });
  const entry: PeerEntry = {
    pc,
    channels: new Map(),
    requestedChannels: channels,
    state: "connecting",
    isInitiator: false,
  };
  ctx.peers.set(peerId, entry);
  ctx.updatePeers();

  pc.ondatachannel = (ev: { channel: RTCDataChannelLike }) => {
    setupDataChannel({
      peerId,
      dc: ev.channel,
      peers: ctx.peers,
      frames$: ctx.frames$,
    });
    entry.channels.set(ev.channel.label, ev.channel);
  };
}

export async function handleOffer(ctx: SignalingContext, frame: StarfishFrame): Promise<void> {
  const peerId = frame.from;
  if (!peerId) return;

  let entry = ctx.peers.get(peerId);
  if (!entry) {
    const pc = createPeerConnection({ peerId, ...ctx });
    entry = {
      pc,
      channels: new Map(),
      requestedChannels: DEFAULT_CHANNELS,
      state: "connecting",
      isInitiator: false,
    };
    ctx.peers.set(peerId, entry);
    ctx.updatePeers();

    pc.ondatachannel = (ev: { channel: RTCDataChannelLike }) => {
      setupDataChannel({
        peerId,
        dc: ev.channel,
        peers: ctx.peers,
        frames$: ctx.frames$,
      });
      entry!.channels.set(ev.channel.label, ev.channel);
    };
  }

  await entry.pc.setRemoteDescription({
    type: "offer",
    sdp: frame.payload.sdp,
  });

  const answer = await entry.pc.createAnswer();
  await entry.pc.setLocalDescription(answer);

  const sessionName = ctx.requireSession();
  ctx.connection.send({
    v: 1,
    id: nextId("rtc"),
    type: "rtc.answer",
    session: sessionName,
    to: peerId,
    payload: { sdp: answer.sdp },
  });
}

export async function handleAnswer(ctx: SignalingContext, frame: StarfishFrame): Promise<void> {
  const peerId = frame.from;
  if (!peerId) return;

  const entry = ctx.peers.get(peerId);
  if (!entry) return;

  await entry.pc.setRemoteDescription({
    type: "answer",
    sdp: frame.payload.sdp,
  });
}

export async function handleIce(ctx: SignalingContext, frame: StarfishFrame): Promise<void> {
  const peerId = frame.from;
  if (!peerId) return;

  const entry = ctx.peers.get(peerId);
  if (!entry) return;

  await entry.pc.addIceCandidate(frame.payload.candidate);
}

export function handleConnected(ctx: SignalingContext, frame: StarfishFrame): void {
  const peerId = frame.from;
  if (!peerId) return;

  const entry = ctx.peers.get(peerId);
  if (!entry) return;

  entry.state = "connected";
  ctx.updatePeers();
}

export function handleDisconnected(ctx: SignalingContext, frame: StarfishFrame): void {
  const peerId = frame.from;
  if (!peerId) return;

  const entry = ctx.peers.get(peerId);
  if (!entry) return;

  entry.pc.close();
  ctx.peers.delete(peerId);
  ctx.updatePeers();
}
