export interface StarfishError {
  code: string;
  resource: string;
  message: string;
  retry: boolean;
  details?: any;
}

export interface DeliveryOptions {
  reliability?: "reliable" | "unreliable" | "latest";
  ordering?: "ordered" | "unordered";
  preferTransport?: "ws" | "rtc" | "auto";
  fallback?: boolean;
  includeSelf?: boolean;
  requireAck?: boolean;
}

export interface StarfishHeader {
  id: string;
  resource: string;
  method: string;
  kind: "request" | "response" | "event";

  v?: number;
  ts?: number;
  session?: string;
  from?: string;
  to?: string | string[];
  topic?: string;
  replyTo?: string;
  meta?: Record<string, unknown>;

  delivery?: DeliveryOptions;
  priority?: "low" | "normal" | "high" | "critical";
  ttl?: number;
}

export interface StarfishFrame {
  header: StarfishHeader;
  payload?: Record<string, any>;
}
