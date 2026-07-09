import type { ReconnectOptions } from "@starfish/client";

export interface P5Instance {
  mouseX: number;
  mouseY: number;
  remove?: () => void;
}

export interface PresenceOptions {
  autoTrackCursor?: boolean;
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
  x: number;
  y: number;
  data: Record<string, unknown>;
}
