// --- Protocol types ---

export interface StarfishError {
  code: string;
  message: string;
  details?: any;
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

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";
