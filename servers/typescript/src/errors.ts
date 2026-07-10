import type { StarfishFrame } from "./types.js";
import type { IDGenerator } from "./id.js";

export const ERR_AUTH_REQUIRED = "auth.required";
export const ERR_AUTH_FAILED = "auth.failed";
export const ERR_SESSION_NOT_FOUND = "session.not_found";
export const ERR_SESSION_FULL = "session.full";
export const ERR_CLIENT_NOT_FOUND = "client.not_found";
export const ERR_TOPIC_INVALID = "topic.invalid";
export const ERR_TOPIC_NOT_SUBSCRIBED = "topic.not_subscribed";
export const ERR_TRANSPORT_UNAVAILABLE = "transport.unavailable";
export const ERR_RTC_FAILED = "rtc.failed";
export const ERR_DATA_INVALID_OP = "data.invalid_op";
export const ERR_DATA_CONFLICT = "data.conflict";
export const ERR_DATA_FORBIDDEN = "data.forbidden";
export const ERR_RATE_LIMITED = "rate_limited";
export const ERR_PAYLOAD_TOO_LARGE = "payload.too_large";
export const ERR_PROTOCOL_INVALID_FRAME = "protocol.invalid_frame";
export const ERR_PROTOCOL_UNSUPPORTED_VERSION = "protocol.unsupported_version";
export const ERR_RESUME_INVALID = "resume.invalid";
export const ERR_RESUME_EXPIRED = "resume.expired";
export const ERR_INTERNAL_ERROR = "internal_error";

const errorMessages: Record<string, string> = {
  [ERR_AUTH_REQUIRED]: "Authentication required.",
  [ERR_AUTH_FAILED]: "Authentication failed.",
  [ERR_SESSION_NOT_FOUND]: "Session does not exist.",
  [ERR_SESSION_FULL]: "Session is at capacity.",
  [ERR_CLIENT_NOT_FOUND]: "Target client not found.",
  [ERR_TOPIC_INVALID]: "Invalid topic name.",
  [ERR_TOPIC_NOT_SUBSCRIBED]: "Client not subscribed to topic.",
  [ERR_TRANSPORT_UNAVAILABLE]: "Requested transport not available.",
  [ERR_RTC_FAILED]: "RTC connection failed.",
  [ERR_DATA_INVALID_OP]: "Invalid data operation.",
  [ERR_DATA_CONFLICT]: "Version mismatch.",
  [ERR_DATA_FORBIDDEN]: "Not authorized for data operation.",
  [ERR_RATE_LIMITED]: "Client is sending too fast.",
  [ERR_PAYLOAD_TOO_LARGE]: "Payload exceeds size limit.",
  [ERR_PROTOCOL_INVALID_FRAME]: "Malformed frame.",
  [ERR_PROTOCOL_UNSUPPORTED_VERSION]: "Unsupported protocol version.",
  [ERR_RESUME_INVALID]: "Resume token is invalid.",
  [ERR_RESUME_EXPIRED]: "Resume token has expired.",
  [ERR_INTERNAL_ERROR]: "Server internal error.",
};

export function createErrorFrame(
  gen: IDGenerator,
  replyTo: string,
  code: string,
  details?: unknown,
): StarfishFrame {
  return {
    v: 1,
    id: gen.messageId(),
    type: "error",
    replyTo,
    error: {
      code,
      message: errorMessages[code] ?? "Unknown error.",
      ...(details !== undefined ? { details } : {}),
    },
  };
}
