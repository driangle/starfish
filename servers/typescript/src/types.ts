export type StarfishFrame = {
  v: 1;
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
  payload?: unknown;
  error?: StarfishError;
};

export type FrameOptions = {
  delivery?: DeliveryOptions;
  priority?: "low" | "normal" | "high" | "critical";
  ttl?: number;
  requireAck?: boolean;
};

export type DeliveryOptions = {
  reliability?: "reliable" | "unreliable" | "latest";
  ordering?: "ordered" | "unordered";
  preferTransport?: "ws" | "rtc" | "auto";
  fallback?: boolean;
  includeSelf?: boolean;
};

export type StarfishError = {
  code: string;
  message: string;
  details?: unknown;
};

export function parseTo(to: string | string[] | undefined): string[] {
  if (to === undefined) return [];
  if (typeof to === "string") return [to];
  return to;
}

export function includeSelf(frame: StarfishFrame): boolean {
  return frame.options?.delivery?.includeSelf === true;
}

export function requireAck(frame: StarfishFrame): boolean {
  return frame.options?.requireAck === true;
}
