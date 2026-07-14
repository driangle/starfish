import {
  StarfishError,
  type StarfishFrame,
  type RTCOptions,
  type RTCPeerState,
  type RTCPeerInfo,
  type PeerEntry,
} from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { Observable, EventStream } from "./emitter.js";
import { MAX_RTC_CONTROL_SIZE, validatePayloadSize } from "./limits.js";
import { validateSerializable } from "./validate.js";
import {
  CHANNEL_CONFIGS,
  CHANNEL_SIZE_LIMITS,
  createPeerConnection,
  setupDataChannel,
} from "./rtc-peer-connection.js";
import {
  handleConnect,
  handleOffer,
  handleAnswer,
  handleIce,
  handleConnected,
  handleDisconnected,
  type SignalingContext,
} from "./rtc-signaling.js";

const DEFAULT_CHANNELS = ["control", "stream", "state"];

export class RTC {
  private connection: Connection;
  private session: Session;
  private rtcOptions: RTCOptions;
  private peers = new Map<string, PeerEntry>();
  private signalingCtx: SignalingContext;

  readonly rtcPeers$ = new Observable<RTCPeerInfo[]>([]);
  readonly frames$ = new EventStream<StarfishFrame>();

  constructor(connection: Connection, session: Session, rtcOptions: RTCOptions) {
    this.connection = connection;
    this.session = session;
    this.rtcOptions = rtcOptions;
    this.signalingCtx = {
      connection,
      session,
      rtcOptions,
      peers: this.peers,
      frames$: this.frames$,
      updatePeers: () => this.updateObservable(),
      requireSession: () => this.session.require(),
    };
  }

  async connect(peerId: string, channels = DEFAULT_CHANNELS): Promise<void> {
    const sessionName = this.session.require();
    const ctx = this.signalingCtx;

    const pc = createPeerConnection({ peerId, ...ctx });
    const entry: PeerEntry = {
      pc,
      channels: new Map(),
      requestedChannels: channels,
      state: "connecting",
      isInitiator: true,
    };
    this.peers.set(peerId, entry);
    this.updateObservable();

    for (const ch of channels) {
      const config = CHANNEL_CONFIGS[ch];
      if (config) {
        const dc = pc.createDataChannel(config.label, config.opts);
        setupDataChannel({
          peerId,
          dc,
          peers: this.peers,
          frames$: this.frames$,
        });
        entry.channels.set(config.label, dc);
      }
    }

    this.sendSignal("rtc.connect", sessionName, peerId, { channels });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal("rtc.offer", sessionName, peerId, { sdp: offer.sdp });
  }

  disconnect(peerId: string): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;

    entry.pc.close();
    this.peers.delete(peerId);
    this.updateObservable();

    const sessionName = this.session.current;
    if (sessionName) {
      this.sendSignal("rtc.disconnected", sessionName, peerId, {
        reason: "local_close",
      });
    }
  }

  send(peerId: string, channel: string, payload: any): void {
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("rtc"),
      type: "client.send",
      session: this.session.current ?? undefined,
      to: peerId,
      transport: "rtc",
      payload,
    };
    this.sendToPeer(peerId, channel, frame);
  }

  sendToPeer(peerId: string, channel: string, frame: StarfishFrame): void {
    const entry = this.peers.get(peerId);
    if (!entry) {
      throw new StarfishError("RTC_NO_PEER", `No RTC connection to peer: ${peerId}`);
    }

    const dc = entry.channels.get(channel);
    if (!dc || dc.readyState !== "open") {
      throw new StarfishError(
        "RTC_CHANNEL_NOT_OPEN",
        `DataChannel ${channel} not open for peer: ${peerId}`,
      );
    }

    validateSerializable(frame, "RTC frame");
    const json = JSON.stringify(frame);
    const limit = CHANNEL_SIZE_LIMITS[channel] ?? MAX_RTC_CONTROL_SIZE;
    validatePayloadSize(json, limit, `RTC ${channel} payload`);

    dc.send(json);
  }

  private static readonly SIGNALING_HANDLERS: Record<
    string,
    (ctx: SignalingContext, frame: StarfishFrame) => void
  > = {
    "rtc.connect": handleConnect,
    "rtc.offer": handleOffer,
    "rtc.answer": handleAnswer,
    "rtc.ice": handleIce,
    "rtc.connected": handleConnected,
    "rtc.disconnected": handleDisconnected,
  };

  handleFrame(frame: StarfishFrame): void {
    RTC.SIGNALING_HANDLERS[frame.type]?.(this.signalingCtx, frame);
  }

  closeAll(): void {
    for (const [, entry] of this.peers) {
      entry.pc.close();
    }
    this.peers.clear();
    this.updateObservable();
  }

  getPeerState(peerId: string): RTCPeerState | null {
    return this.peers.get(peerId)?.state ?? null;
  }
  hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }
  isPeerConnected(peerId: string): boolean {
    return this.peers.get(peerId)?.state === "connected";
  }
  getConnectedPeerIds(): string[] {
    return [...this.peers].filter(([, e]) => e.state === "connected").map(([id]) => id);
  }

  private sendSignal(type: string, session: string, to: string, payload?: any): void {
    this.connection.send({ v: 1, id: nextId("rtc"), type, session, to, payload });
  }

  private updateObservable(): void {
    this.rtcPeers$.set(
      [...this.peers].map(([peerId, entry]) => ({
        peerId,
        state: entry.state,
        channels: Array.from(entry.channels.keys()),
      })),
    );
  }
}
