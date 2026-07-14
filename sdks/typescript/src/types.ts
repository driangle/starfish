// --- Protocol types ---

export class StarfishError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "StarfishError";
  }
}

export interface DeliveryOptions {
  reliability?: "reliable" | "unreliable" | "latest";
  ordering?: "ordered" | "unordered";
  preferTransport?: "ws" | "rtc" | "auto";
  fallback?: boolean;
  includeSelf?: boolean;
}

export interface FrameOptions {
  delivery?: DeliveryOptions;
  priority?: "low" | "normal" | "high" | "critical";
  ttl?: number;
  requireAck?: boolean;
}

export interface StarfishFrame {
  v: number;
  id: string;
  type: string;
  ts?: number;
  session?: string;
  from?: string;
  to?: string | string[];
  topic?: string;
  ack?: boolean;
  replyTo?: string;
  transport?: "ws" | "rtc";
  options?: FrameOptions;
  payload?: any;
  error?: StarfishError;
}

// --- Client configuration ---

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: any) => void) | null;
  onclose: ((ev: any) => void) | null;
  onmessage: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export interface ReconnectOptions {
  enabled?: boolean;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export interface ClientIdentity {
  name?: string;
  role?: string;
  meta?: Record<string, unknown>;
}

export interface StarfishClientOptions {
  server: string;
  ws?: WebSocketFactory;
  client?: ClientIdentity;
  auth?: { type: string; token?: string };
  reconnect?: ReconnectOptions;
  rtc?: RTCOptions;
}

// --- Data types ---

export type DataOp =
  | "replace"
  | "merge"
  | "set.add"
  | "set.remove"
  | "list.add"
  | "list.remove"
  | "counter.add"
  | "delete";

export interface SaveOptions {
  key: string;
  scope: "self" | "session";
  op: DataOp;
  data?: unknown;
  expectedVersion?: number;
}

export interface DataResult {
  key: string;
  scope: "self" | "session";
  data: unknown;
  version: number;
}

// --- Session types ---

export interface JoinOptions {
  name?: string;
  role?: string;
  meta?: Record<string, unknown>;
  create?: boolean;
}

export interface ClientInfo {
  id: string;
  name?: string;
  role?: string;
  meta?: Record<string, unknown>;
}

// --- Event filtering ---

export interface EventFilter {
  type?: string;
  topic?: string;
  from?: string;
}

// --- Connection state ---

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

// --- WebRTC types ---

export interface RTCDataChannelLike {
  readonly label: string;
  readonly readyState: string;
  send(data: string): void;
  close(): void;
  onopen: ((ev: any) => void) | null;
  onclose: ((ev: any) => void) | null;
  onmessage: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
}

export interface RTCSessionDescriptionLike {
  type: string;
  sdp: string;
}

export interface RTCIceCandidateLike {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface RTCPeerConnectionLike {
  readonly connectionState: string;
  createOffer(): Promise<RTCSessionDescriptionLike>;
  createAnswer(): Promise<RTCSessionDescriptionLike>;
  setLocalDescription(desc: RTCSessionDescriptionLike): Promise<void>;
  setRemoteDescription(desc: RTCSessionDescriptionLike): Promise<void>;
  addIceCandidate(candidate: RTCIceCandidateLike): Promise<void>;
  createDataChannel(label: string, opts?: any): RTCDataChannelLike;
  close(): void;
  onicecandidate: ((ev: { candidate: RTCIceCandidateLike | null }) => void) | null;
  ondatachannel: ((ev: { channel: RTCDataChannelLike }) => void) | null;
  onconnectionstatechange: ((ev: any) => void) | null;
}

export type RTCPeerConnectionFactory = (config?: { iceServers?: any[] }) => RTCPeerConnectionLike;

export interface RTCOptions {
  factory: RTCPeerConnectionFactory;
  iceServers?: any[];
}

export type RTCPeerState = "connecting" | "connected" | "disconnected" | "failed";

export interface RTCPeerInfo {
  peerId: string;
  state: RTCPeerState;
  channels: string[];
}

export interface PeerEntry {
  pc: RTCPeerConnectionLike;
  channels: Map<string, RTCDataChannelLike>;
  requestedChannels: string[];
  state: RTCPeerState;
  isInitiator: boolean;
}
