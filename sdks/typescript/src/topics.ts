import type { StarfishFrame, FrameOptions } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import type { RTC } from "./rtc.js";
import { selectTransport, type RTCState } from "./transport.js";
import { nextId } from "./id.js";
import { EventStream } from "./emitter.js";
import { validateTopicName } from "./limits.js";

export class Topics {
  private connection: Connection;
  private session: Session;
  private rtc: RTC | null;
  private topicStreams = new Map<string, EventStream<StarfishFrame>>();
  private subscriptions = new Set<string>();
  private topicPeers = new Map<string, Set<string>>();

  constructor(connection: Connection, session: Session, rtc: RTC | null = null) {
    this.connection = connection;
    this.session = session;
    this.rtc = rtc;
  }

  async subscribe(
    topic: string,
    callback?: (frame: StarfishFrame) => void,
  ): Promise<StarfishFrame> {
    validateTopicName(topic);

    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("sub"),
      type: "topic.subscribe",
      session: sessionName,
      topic,
    };

    const response = await this.connection.sendAndWait(frame);
    this.subscriptions.add(topic);

    if (callback) {
      this.topic$(topic).subscribe(callback);
    }

    return response;
  }

  async unsubscribe(topic: string): Promise<void> {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("unsub"),
      type: "topic.unsubscribe",
      session: sessionName,
      topic,
    };

    this.connection.send(frame);
    this.subscriptions.delete(topic);
    this.topicPeers.delete(topic);
  }

  publish(topic: string, payload: any, options?: FrameOptions): void {
    validateTopicName(topic);

    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("pub"),
      type: "topic.publish",
      session: sessionName,
      topic,
      payload,
      ...(options && { options }),
    };

    const decision = selectTransport(
      frame,
      options?.delivery,
      this.rtcState(),
    );

    if (decision.transport === "rtc") {
      const channel = this.rtcChannelForDelivery(options?.delivery);
      for (const peerId of decision.peers) {
        this.rtc!.sendToPeer(peerId, channel, frame);
      }
    } else {
      this.connection.send(frame);
    }
  }

  topic$(topic: string): EventStream<StarfishFrame> {
    let stream = this.topicStreams.get(topic);
    if (!stream) {
      stream = new EventStream<StarfishFrame>();
      this.topicStreams.set(topic, stream);
    }
    return stream;
  }

  getTopicPeers(topic: string): string[] {
    const peers = this.topicPeers.get(topic);
    return peers ? Array.from(peers) : [];
  }

  handleFrame(frame: StarfishFrame): void {
    if (frame.type === "topic.peers" && frame.topic) {
      const subscribers: string[] = frame.payload?.subscribers ?? [];
      this.topicPeers.set(frame.topic, new Set(subscribers));
      return;
    }

    if (frame.type === "topic.message" && frame.topic) {
      // Receiver-side validation: drop RTC messages for unsubscribed topics
      if (frame.transport === "rtc" && !this.subscriptions.has(frame.topic)) {
        return;
      }

      const stream = this.topicStreams.get(frame.topic);
      if (stream) {
        stream.emit(frame);
      }
    }
  }

  private rtcState(): RTCState | null {
    if (!this.rtc) return null;
    const rtc = this.rtc;
    const topicPeers = this.topicPeers;
    return {
      isPeerConnected: (peerId) => rtc.isPeerConnected(peerId),
      getConnectedPeerIds: () => rtc.getConnectedPeerIds(),
      getTopicPeers: (topic) => {
        const peers = topicPeers.get(topic);
        return peers ? Array.from(peers) : [];
      },
    };
  }

  private rtcChannelForDelivery(delivery?: { reliability?: string }): string {
    const reliability = delivery?.reliability ?? "reliable";
    return reliability === "unreliable"
      ? "starfish.stream"
      : "starfish.control";
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new Error("Not in a session. Call join() first.");
    }
    return session;
  }
}
