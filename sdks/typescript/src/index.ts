export { StarfishClient } from "./client.js";
export { StarfishError } from "./types.js";

export type {
  StarfishFrame,
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
  RTCOptions,
  RTCPeerConnectionLike,
  RTCPeerConnectionFactory,
  RTCDataChannelLike,
  RTCSessionDescriptionLike,
  RTCIceCandidateLike,
  RTCPeerState,
  RTCPeerInfo,
} from "./types.js";

export type {
  PoolMode,
  PoolRole,
  PoolMember,
  PoolEnterOptions,
  PoolMatchedEvent,
} from "./pool-types.js";

export { Observable, EventStream, type Unsubscribe } from "./emitter.js";
export { Clock } from "./clock.js";
export { Presence } from "./presence.js";
export { Pool } from "./pool.js";
