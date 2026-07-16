import type { ReconnectOptions } from "@driangle/starfish-client";

export interface P5Instance {
  remove?: () => void;
}

export interface PresenceOptions {
  throttleMs?: number;
}

export interface StarfishP5Options {
  url: string;
  session: string;
  p5?: P5Instance;
  name?: string;
  meta?: Record<string, unknown>;
  presence?: PresenceOptions;
  auth?: { type: string; token?: string };
  reconnect?: ReconnectOptions;
}

export interface PeerPresence {
  id: string;
  name?: string;
  presence: Record<string, unknown>;
}

export interface PoolOptions {
  groupSize?: number;
  mode?: "auto" | "claim" | "mutual" | "propose" | "delegated";
  attributes?: Record<string, unknown>;
  filter?: Record<string, string>;
}

export type PoolMatchCallback = (match: { pool: string; peers: string[]; session: string }) => void;
