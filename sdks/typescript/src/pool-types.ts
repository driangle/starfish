export type PoolMode = "auto" | "claim" | "mutual" | "propose" | "delegated";

export type PoolRole = "member" | "matchmaker";

export interface PoolMember {
  id: string;
  attributes?: Record<string, unknown>;
}

export interface PoolEnterOptions {
  groupSize: number;
  mode?: PoolMode;
  role?: PoolRole;
  attributes?: Record<string, unknown>;
  filter?: Record<string, string>;
  create?: boolean;
}

export interface PoolMatchedEvent {
  pool: string;
  session: string;
  peers: PoolMember[];
}
