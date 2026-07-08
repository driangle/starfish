export interface StarfishError {
  code: string;
  message: string;
  details?: any;
}

export interface DeliveryOptions {
  reliability?: "reliable" | "unreliable" | "latest";
  ordering?: "ordered" | "unordered";
  preferTransport?: "ws" | "rtc" | "auto";
  fallback?: boolean;
  includeSelf?: boolean;
}

export interface FrameOptions {
  delivery?: DeliveryOptions;
  priority?: "low" | "normal" | "high" | "critical";
  ttl?: number;
  requireAck?: boolean;
}

export interface StarfishFrame {
  v: number;
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
  payload?: any;
  error?: StarfishError;
}
