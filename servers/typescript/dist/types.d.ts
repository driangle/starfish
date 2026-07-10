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
export declare function parseTo(to: string | string[] | undefined): string[];
export declare function includeSelf(frame: StarfishFrame): boolean;
export declare function requireAck(frame: StarfishFrame): boolean;
//# sourceMappingURL=types.d.ts.map