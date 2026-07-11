export const SERVER_URL = process.env.STARFISH_SERVER_URL ?? "ws://localhost:8080/starfish";

export const DEFAULT_TIMEOUT = 5000;
export const SHORT_TIMEOUT = 1000;

let counter = 0;

export function uniqueId(prefix = "msg"): string {
  return `${prefix}_${Date.now()}_${++counter}`;
}

export function uniqueSession(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
