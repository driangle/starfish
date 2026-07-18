import type { ReconnectOptions } from "./types.js";

const DEFAULTS = {
  enabled: true,
  maxRetries: Infinity,
  baseDelay: 1000,
  maxDelay: 30_000,
};

export function computeReconnectDelay(attempt: number, options?: ReconnectOptions): number | null {
  const opts = { ...DEFAULTS, ...options };

  if (!opts.enabled || attempt >= opts.maxRetries) return null;

  return Math.min(
    opts.baseDelay * Math.pow(2, attempt) + Math.random() * opts.baseDelay,
    opts.maxDelay,
  );
}
