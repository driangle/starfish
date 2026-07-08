export { StarfishClient } from "./client.js";

export type {
  StarfishFrame,
  StarfishError,
  DeliveryOptions,
  FrameOptions,
  StarfishClientOptions,
  ReconnectOptions,
  ClientIdentity,
  JoinOptions,
  ClientInfo,
  SaveOptions,
  DataOp,
  DataResult,
  EventFilter,
  ConnectionState,
  WebSocketLike,
  WebSocketFactory,
} from "./types.js";

export { Observable, EventStream, type Unsubscribe } from "./emitter.js";
export { Clock } from "./clock.js";
export { Presence } from "./presence.js";
