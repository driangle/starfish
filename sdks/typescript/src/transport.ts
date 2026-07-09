import type { StarfishFrame, DeliveryOptions, StarfishError } from "./types.js";

export interface RTCState {
  isPeerConnected(peerId: string): boolean;
  getConnectedPeerIds(): string[];
  getTopicPeers(topic: string): string[];
}

export type TransportDecision =
  | { transport: "ws" }
  | { transport: "rtc"; peers: string[] };

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

  const error: StarfishError = {
    code: "transport.unavailable",
    message: "RTC transport is not available and fallback is disabled",
  };
  throw error;
}

function selectAuto(
  frame: StarfishFrame,
  delivery: DeliveryOptions | undefined,
  rtcState: RTCState | null,
): TransportDecision {
  const type = frame.type;

  // data.*, session.*, presence.* → always WS
  if (
    type.startsWith("data.") ||
    type.startsWith("session.") ||
    type.startsWith("presence.")
  ) {
    return { transport: "ws" };
  }

  // topic.publish
  if (type === "topic.publish") {
    const reliability = delivery?.reliability ?? "reliable";
    if (reliability === "reliable") {
      return { transport: "ws" };
    }
    // unreliable/latest → RTC if peer path exists
    const peers = frame.topic
      ? rtcState?.getTopicPeers(frame.topic) ?? []
      : [];
    const connectedPeers = peers.filter(
      (p) => rtcState?.isPeerConnected(p) ?? false,
    );
    return connectedPeers.length > 0
      ? { transport: "rtc", peers: connectedPeers }
      : { transport: "ws" };
  }

  // client.send
  if (type === "client.send") {
    const reliability = delivery?.reliability ?? "reliable";
    const peers = resolveAvailablePeers(frame, rtcState);

    if (reliability === "reliable") {
      // RTC if connected, else WS
      return peers.length > 0
        ? { transport: "rtc", peers }
        : { transport: "ws" };
    }

    // unreliable/latest → RTC preferred
    return peers.length > 0
      ? { transport: "rtc", peers }
      : { transport: "ws" };
  }

  // Everything else (session.broadcast, etc.) → WS
  return { transport: "ws" };
}

/** Resolve peers from frame.to (direct messaging) or topic peers (topic publishing) */
function resolveAvailablePeers(
  frame: StarfishFrame,
  rtcState: RTCState | null,
): string[] {
  if (!rtcState) return [];

  // For topic.publish, resolve peers from the topic subscription map
  if (frame.type === "topic.publish" && frame.topic) {
    const topicPeers = rtcState.getTopicPeers(frame.topic);
    return topicPeers.filter((peerId) => rtcState.isPeerConnected(peerId));
  }

  // For direct messages, resolve from frame.to
  const targets = Array.isArray(frame.to)
    ? frame.to
    : frame.to
      ? [frame.to]
      : [];

  return targets.filter((peerId) => rtcState.isPeerConnected(peerId));
}
