import type {
  StarfishFrame,
  RTCOptions,
  RTCPeerConnectionLike,
  RTCDataChannelLike,
  RTCPeerState,
  RTCPeerInfo,
} from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { Observable, EventStream } from "./emitter.js";
import {
  MAX_RTC_CONTROL_SIZE,
  MAX_RTC_STREAM_SIZE,
  validatePayloadSize,
} from "./limits.js";

const DEFAULT_CHANNELS = ["control", "stream", "state"];

const CHANNEL_CONFIGS: Record<string, { label: string; opts: any }> = {
  control: { label: "starfish.control", opts: { ordered: true } },
  stream: {
    label: "starfish.stream",
    opts: { ordered: false, maxRetransmits: 0 },
  },
  state: { label: "starfish.state", opts: { ordered: true } },
};

const CHANNEL_SIZE_LIMITS: Record<string, number> = {
  "starfish.control": MAX_RTC_CONTROL_SIZE,
  "starfish.stream": MAX_RTC_STREAM_SIZE,
  "starfish.state": MAX_RTC_CONTROL_SIZE,
};

interface PeerEntry {
  pc: RTCPeerConnectionLike;
  channels: Map<string, RTCDataChannelLike>;
  requestedChannels: string[];
  state: RTCPeerState;
  isInitiator: boolean;
}

export class RTC {
  private connection: Connection;
  private session: Session;
  private rtcOptions: RTCOptions;
  private peers = new Map<string, PeerEntry>();

  readonly rtcPeers$ = new Observable<RTCPeerInfo[]>([]);
  readonly frames$ = new EventStream<StarfishFrame>();

  constructor(connection: Connection, session: Session, rtcOptions: RTCOptions) {
    this.connection = connection;
    this.session = session;
    this.rtcOptions = rtcOptions;
  }

  async connect(peerId: string, channels = DEFAULT_CHANNELS): Promise<void> {
    const sessionName = this.requireSession();

    const pc = this.createPeerConnection(peerId);
    const entry: PeerEntry = {
      pc,
      channels: new Map(),
      requestedChannels: channels,
      state: "connecting",
      isInitiator: true,
    };
    this.peers.set(peerId, entry);
    this.updateObservable();

    // Create DataChannels (initiator creates them)
    for (const ch of channels) {
      const config = CHANNEL_CONFIGS[ch];
      if (config) {
        const dc = pc.createDataChannel(config.label, config.opts);
        this.setupDataChannel(peerId, dc);
        entry.channels.set(config.label, dc);
      }
    }

    // Send rtc.connect request via WS
    this.connection.send({
      v: 1,
      id: nextId("rtc"),
      type: "rtc.connect",
      session: sessionName,
      to: peerId,
      payload: { channels },
    });

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.connection.send({
      v: 1,
      id: nextId("rtc"),
      type: "rtc.offer",
      session: sessionName,
      to: peerId,
      payload: { sdp: offer.sdp },
    });
  }

  disconnect(peerId: string): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;

    const sessionName = this.session.current;

    entry.pc.close();
    this.peers.delete(peerId);
    this.updateObservable();

    if (sessionName) {
      this.connection.send({
        v: 1,
        id: nextId("rtc"),
        type: "rtc.disconnected",
        session: sessionName,
        to: peerId,
        payload: { reason: "local_close" },
      });
    }
  }

  sendToPeer(peerId: string, channel: string, frame: StarfishFrame): void {
    const entry = this.peers.get(peerId);
    if (!entry) {
      throw new Error(`No RTC connection to peer: ${peerId}`);
    }

    const dc = entry.channels.get(channel);
    if (!dc || dc.readyState !== "open") {
      throw new Error(`DataChannel ${channel} not open for peer: ${peerId}`);
    }

    const json = JSON.stringify(frame);
    const limit = CHANNEL_SIZE_LIMITS[channel] ?? MAX_RTC_CONTROL_SIZE;
    validatePayloadSize(json, limit, `RTC ${channel} payload`);

    dc.send(json);
  }

  handleFrame(frame: StarfishFrame): void {
    switch (frame.type) {
      case "rtc.connect":
        this.handleConnect(frame);
        break;
      case "rtc.offer":
        this.handleOffer(frame);
        break;
      case "rtc.answer":
        this.handleAnswer(frame);
        break;
      case "rtc.ice":
        this.handleIce(frame);
        break;
      case "rtc.connected":
        this.handleConnected(frame);
        break;
      case "rtc.disconnected":
        this.handleDisconnected(frame);
        break;
    }
  }

  closeAll(): void {
    for (const [peerId, entry] of this.peers) {
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
    const result: string[] = [];
    for (const [peerId, entry] of this.peers) {
      if (entry.state === "connected") {
        result.push(peerId);
      }
    }
    return result;
  }

  private handleConnect(frame: StarfishFrame): void {
    const peerId = frame.from;
    if (!peerId) return;

    const channels: string[] = frame.payload?.channels ?? DEFAULT_CHANNELS;

    // Responder: create peer connection, wait for offer
    const pc = this.createPeerConnection(peerId);
    const entry: PeerEntry = {
      pc,
      channels: new Map(),
      requestedChannels: channels,
      state: "connecting",
      isInitiator: false,
    };
    this.peers.set(peerId, entry);
    this.updateObservable();

    // Responder receives DataChannels via ondatachannel
    pc.ondatachannel = (ev) => {
      this.setupDataChannel(peerId, ev.channel);
      entry.channels.set(ev.channel.label, ev.channel);
    };
  }

  private async handleOffer(frame: StarfishFrame): Promise<void> {
    const peerId = frame.from;
    if (!peerId) return;

    let entry = this.peers.get(peerId);
    if (!entry) {
      // Got an offer without rtc.connect — create entry as responder
      const pc = this.createPeerConnection(peerId);
      entry = {
        pc,
        channels: new Map(),
        requestedChannels: DEFAULT_CHANNELS,
        state: "connecting",
        isInitiator: false,
      };
      this.peers.set(peerId, entry);
      this.updateObservable();

      pc.ondatachannel = (ev) => {
        this.setupDataChannel(peerId, ev.channel);
        entry!.channels.set(ev.channel.label, ev.channel);
      };
    }

    await entry.pc.setRemoteDescription({
      type: "offer",
      sdp: frame.payload.sdp,
    });

    const answer = await entry.pc.createAnswer();
    await entry.pc.setLocalDescription(answer);

    const sessionName = this.requireSession();
    this.connection.send({
      v: 1,
      id: nextId("rtc"),
      type: "rtc.answer",
      session: sessionName,
      to: peerId,
      payload: { sdp: answer.sdp },
    });
  }

  private async handleAnswer(frame: StarfishFrame): Promise<void> {
    const peerId = frame.from;
    if (!peerId) return;

    const entry = this.peers.get(peerId);
    if (!entry) return;

    await entry.pc.setRemoteDescription({
      type: "answer",
      sdp: frame.payload.sdp,
    });
  }

  private async handleIce(frame: StarfishFrame): Promise<void> {
    const peerId = frame.from;
    if (!peerId) return;

    const entry = this.peers.get(peerId);
    if (!entry) return;

    await entry.pc.addIceCandidate(frame.payload.candidate);
  }

  private handleConnected(frame: StarfishFrame): void {
    const peerId = frame.from;
    if (!peerId) return;

    const entry = this.peers.get(peerId);
    if (!entry) return;

    entry.state = "connected";
    this.updateObservable();
  }

  private handleDisconnected(frame: StarfishFrame): void {
    const peerId = frame.from;
    if (!peerId) return;

    const entry = this.peers.get(peerId);
    if (!entry) return;

    entry.pc.close();
    this.peers.delete(peerId);
    this.updateObservable();
  }

  private createPeerConnection(peerId: string): RTCPeerConnectionLike {
    const config = this.rtcOptions.iceServers
      ? { iceServers: this.rtcOptions.iceServers }
      : undefined;

    const pc = this.rtcOptions.factory(config);

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;

      const sessionName = this.session.current;
      if (!sessionName) return;

      this.connection.send({
        v: 1,
        id: nextId("rtc"),
        type: "rtc.ice",
        session: sessionName,
        to: peerId,
        payload: { candidate: ev.candidate },
      });
    };

    pc.onconnectionstatechange = () => {
      const entry = this.peers.get(peerId);
      if (!entry) return;

      const state = pc.connectionState;
      if (state === "connected") {
        entry.state = "connected";
        this.updateObservable();

        const sessionName = this.session.current;
        if (sessionName) {
          this.connection.send({
            v: 1,
            id: nextId("rtc"),
            type: "rtc.connected",
            session: sessionName,
            to: peerId,
          });
        }
      } else if (state === "failed") {
        entry.state = "failed";
        this.updateObservable();

        const sessionName = this.session.current;
        if (sessionName) {
          this.connection.send({
            v: 1,
            id: nextId("rtc"),
            type: "rtc.disconnected",
            session: sessionName,
            to: peerId,
            payload: { reason: "ice_failed" },
          });
        }

        entry.pc.close();
        this.peers.delete(peerId);
        this.updateObservable();
      } else if (state === "disconnected" || state === "closed") {
        entry.pc.close();
        this.peers.delete(peerId);
        this.updateObservable();
      }
    };

    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannelLike): void {
    dc.onmessage = (ev) => {
      const data = typeof ev.data === "string" ? ev.data : String(ev.data);

      const limit = CHANNEL_SIZE_LIMITS[dc.label] ?? MAX_RTC_CONTROL_SIZE;
      const size = new TextEncoder().encode(data).byteLength;
      if (size > limit) return; // silently drop oversized

      const frame: StarfishFrame = JSON.parse(data);
      frame.transport = "rtc";
      this.frames$.emit(frame);
    };

    dc.onclose = () => {
      const entry = this.peers.get(peerId);
      if (entry) {
        entry.channels.delete(dc.label);
      }
    };
  }

  private updateObservable(): void {
    const infos: RTCPeerInfo[] = [];
    for (const [peerId, entry] of this.peers) {
      infos.push({
        peerId,
        state: entry.state,
        channels: Array.from(entry.channels.keys()),
      });
    }
    this.rtcPeers$.set(infos);
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new Error("Not in a session. Call join() first.");
    }
    return session;
  }
}
