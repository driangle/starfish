import { MAX_WS_MESSAGE_SIZE } from "./limits.js";

export type ICEServer = {
  urls: string;
};

export type StarfishConfig = {
  port: number;
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
  resumeTimeoutMs: number;
  maxWsMessageSize: number;
  iceServers: ICEServer[];
};

export function defaultConfig(): StarfishConfig {
  return {
    port: 8080,
    heartbeatIntervalMs: 15_000,
    heartbeatTimeoutMs: 30_000,
    resumeTimeoutMs: 30_000,
    maxWsMessageSize: MAX_WS_MESSAGE_SIZE,
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };
}
