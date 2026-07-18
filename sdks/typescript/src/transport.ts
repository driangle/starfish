import { StarfishError, type StarfishFrame, type DeliveryOptions } from "./types.js";

export interface RTCState {
  isPeerConnected(peerId: string): boolean;
  getConnectedPeerIds(): string[];
  getTopicPeers(topic: string): string[];
}

export type TransportDecision = { transport: "ws" } | { transport: "rtc"; peers: string[] };

export function selectTransport(
  frame: StarfishFrame,
  delivery: DeliveryOptions | undefined,
  rtcState: RTCState | null,
): TransportDecision {
  const prefer = delivery?.preferTransport ?? "auto";

  if (prefer === "ws") {
    return { transport: "ws" };
  }

  if (prefer === "rtc") {
    return selectRTC(frame, delivery, rtcState);
  }

  // auto
  return selectAuto(frame, delivery, rtcState);
}

function selectRTC(
  frame: StarfishFrame,
  delivery: DeliveryOptions | undefined,
  rtcState: RTCState | null,
): TransportDecision {
  const peers = resolveAvailablePeers(frame, rtcState);

  if (peers.length > 0) {
    return { transport: "rtc", peers };
  }

  if (delivery?.fallback !== false) {
    return { transport: "ws" };
  }

  throw new StarfishError(
    "TRANSPORT_UNAVAILABLE",
    "RTC transport is not available and fallback is disabled",
  );
}

function selectAuto(
  frame: StarfishFrame,
  delivery: DeliveryOptions | undefined,
  rtcState: RTCState | null,
): TransportDecision {
  const { resource, method } = frame.header;

  // data, session, presence → always WS
  if (resource === "data" || resource === "session" || resource === "presence") {
    return { transport: "ws" };
  }

  // topic publish
  if (resource === "topic" && method === "publish") {
    const reliability = delivery?.reliability ?? "reliable";
    if (reliability === "reliable") {
      return { transport: "ws" };
    }
    // unreliable/latest → RTC if peer path exists
    const topic = frame.header.topic;
    const peers = topic ? (rtcState?.getTopicPeers(topic) ?? []) : [];
    const connectedPeers = peers.filter((p) => rtcState?.isPeerConnected(p) ?? false);
    return connectedPeers.length > 0
      ? { transport: "rtc", peers: connectedPeers }
      : { transport: "ws" };
  }

  // message send
  if (resource === "message" && method === "send") {
    const reliability = delivery?.reliability ?? "reliable";
    const peers = resolveAvailablePeers(frame, rtcState);

    if (reliability === "reliable") {
      // RTC if connected, else WS
      return peers.length > 0 ? { transport: "rtc", peers } : { transport: "ws" };
    }

    // unreliable/latest → RTC preferred
    return peers.length > 0 ? { transport: "rtc", peers } : { transport: "ws" };
  }

  // Everything else → WS
  return { transport: "ws" };
}

/** Resolve peers from frame.header.to (direct messaging) or topic peers (topic publishing) */
function resolveAvailablePeers(frame: StarfishFrame, rtcState: RTCState | null): string[] {
  if (!rtcState) return [];

  // For topic publish, resolve peers from the topic subscription map
  if (
    frame.header.resource === "topic" &&
    frame.header.method === "publish" &&
    frame.header.topic
  ) {
    const topicPeers = rtcState.getTopicPeers(frame.header.topic);
    return topicPeers.filter((peerId) => rtcState.isPeerConnected(peerId));
  }

  // For direct messages, resolve from frame.header.to
  const to = frame.header.to;
  const targets = Array.isArray(to) ? to : to ? [to] : [];

  return targets.filter((peerId) => rtcState.isPeerConnected(peerId));
}
