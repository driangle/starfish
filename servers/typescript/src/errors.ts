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
export const ERR_POOL_NOT_FOUND = "pool.not_found";
export const ERR_POOL_NOT_MEMBER = "pool.not_member";
export const ERR_POOL_TARGET_NOT_FOUND = "pool.target_not_found";
export const ERR_POOL_ALREADY_MATCHED = "pool.already_matched";
export const ERR_POOL_MODE_MISMATCH = "pool.mode_mismatch";
export const ERR_POOL_ROLE_REQUIRED = "pool.role_required";
export const ERR_POOL_INVALID_GROUP = "pool.invalid_group";
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
  [ERR_PROTOCOL_UNSUPPORTED_VERSION]: "None of the requested versions are supported.",
  [ERR_RESUME_INVALID]: "Resume token is invalid.",
  [ERR_RESUME_EXPIRED]: "Resume token has expired.",
  [ERR_POOL_NOT_FOUND]: "Pool does not exist.",
  [ERR_POOL_NOT_MEMBER]: "Client is not a member of this pool.",
  [ERR_POOL_TARGET_NOT_FOUND]: "Target client not found in pool.",
  [ERR_POOL_ALREADY_MATCHED]: "Target was already matched.",
  [ERR_POOL_MODE_MISMATCH]: "Operation not allowed in this pool mode.",
  [ERR_POOL_ROLE_REQUIRED]: "Operation requires matchmaker role.",
  [ERR_POOL_INVALID_GROUP]: "Group size does not match pool groupSize.",
  [ERR_INTERNAL_ERROR]: "Server internal error.",
};

const errorResources: Record<string, string> = {
  [ERR_AUTH_REQUIRED]: "client",
  [ERR_AUTH_FAILED]: "client",
  [ERR_SESSION_NOT_FOUND]: "session",
  [ERR_SESSION_FULL]: "session",
  [ERR_CLIENT_NOT_FOUND]: "message",
  [ERR_TOPIC_INVALID]: "topic",
  [ERR_TOPIC_NOT_SUBSCRIBED]: "topic",
  [ERR_TRANSPORT_UNAVAILABLE]: "rtc",
  [ERR_RTC_FAILED]: "rtc",
  [ERR_DATA_INVALID_OP]: "data",
  [ERR_DATA_CONFLICT]: "data",
  [ERR_DATA_FORBIDDEN]: "data",
  [ERR_RATE_LIMITED]: "client",
  [ERR_PAYLOAD_TOO_LARGE]: "client",
  [ERR_PROTOCOL_INVALID_FRAME]: "client",
  [ERR_PROTOCOL_UNSUPPORTED_VERSION]: "client",
  [ERR_RESUME_INVALID]: "client",
  [ERR_RESUME_EXPIRED]: "client",
  [ERR_POOL_NOT_FOUND]: "pool",
  [ERR_POOL_NOT_MEMBER]: "pool",
  [ERR_POOL_TARGET_NOT_FOUND]: "pool",
  [ERR_POOL_ALREADY_MATCHED]: "pool",
  [ERR_POOL_MODE_MISMATCH]: "pool",
  [ERR_POOL_ROLE_REQUIRED]: "pool",
  [ERR_POOL_INVALID_GROUP]: "pool",
  [ERR_INTERNAL_ERROR]: "client",
};

const retryableCodes = new Set([
  ERR_SESSION_FULL,
  ERR_TRANSPORT_UNAVAILABLE,
  ERR_RTC_FAILED,
  ERR_DATA_CONFLICT,
  ERR_RATE_LIMITED,
  ERR_INTERNAL_ERROR,
]);

export function createErrorFrame(
  gen: IDGenerator,
  replyTo: string,
  code: string,
  resource?: string,
  method?: string,
  details?: unknown,
): StarfishFrame {
  const errorResource = errorResources[code] ?? "client";
  return {
    header: {
      id: gen.messageId(),
      resource: resource ?? errorResource,
      method: method ?? "error",
      kind: "response",
      replyTo,
    },
    payload: {
      status: "error",
      error: {
        code,
        resource: errorResource,
        message: errorMessages[code] ?? "Unknown error.",
        retry: retryableCodes.has(code),
      },
      ...(details !== undefined ? { details } : {}),
    },
  };
}
