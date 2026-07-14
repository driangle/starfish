import type { ReconnectOptions } from "@driangle/starfish-client";

export interface Peer {
  id: string;
  name?: string;
  presence: Record<string, unknown>;
}

export interface PeerCallbacks {
  onJoin?: (peer: Peer) => void;
  onUpdate?: (peer: Peer) => void;
  onLeave?: (peer: Peer) => void;
}

export interface PresenceOptions {
  throttleMs?: number;
}

export interface StarfishThreeOptions {
  url: string;
  session: string;
  name?: string;
  meta?: Record<string, unknown>;
  presence?: PresenceOptions;
  peers?: PeerCallbacks;
  auth?: { type: string; token?: string };
  reconnect?: ReconnectOptions;
}
