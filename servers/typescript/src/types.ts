export type DeliveryOptions = {
  reliability?: "reliable" | "unreliable" | "latest";
  ordering?: "ordered" | "unordered";
  preferTransport?: "ws" | "rtc" | "auto";
  fallback?: boolean;
  includeSelf?: boolean;
  requireAck?: boolean;
};

export type StarfishHeader = {
  v?: 1;
  id: string;
  resource: string;
  method: string;
  kind: "request" | "response" | "event";
  ts?: number;
  session?: string;
  from?: string;
  to?: string | string[];
  topic?: string;
  replyTo?: string;
  delivery?: DeliveryOptions;
  priority?: "low" | "normal" | "high" | "critical";
  ttl?: number;
  meta?: Record<string, unknown>;
};

export type StarfishFrame = {
  header: StarfishHeader;
  payload?: Record<string, unknown>;
};

export type StarfishError = {
  code: string;
  resource: string;
  message: string;
  retry: boolean;
};

export function parseTo(to: string | string[] | undefined): string[] {
  if (to === undefined) return [];
  if (typeof to === "string") return [to];
  return to;
}

export function includeSelf(frame: StarfishFrame): boolean {
  return frame.header.delivery?.includeSelf === true;
}

export function requireAck(frame: StarfishFrame): boolean {
  return frame.header.delivery?.requireAck === true;
}
