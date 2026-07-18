import { StarfishError, type StarfishFrame, type HeaderOptions } from "./types.js";
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
      header: {
        id: nextId("sub"),
        resource: "topic",
        method: "subscribe",
        kind: "request",
        session: sessionName,
        topic,
      },
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
      header: {
        id: nextId("unsub"),
        resource: "topic",
        method: "unsubscribe",
        kind: "request",
        session: sessionName,
        topic,
      },
    };

    this.connection.send(frame);
    this.subscriptions.delete(topic);
    this.topicPeers.delete(topic);
  }

  publish(topic: string, payload: any, options?: HeaderOptions): void {
    validateTopicName(topic);

    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      header: {
        id: nextId("pub"),
        resource: "topic",
        method: "publish",
        kind: "request",
        session: sessionName,
        topic,
        ...(options?.delivery && { delivery: options.delivery }),
        ...(options?.priority && { priority: options.priority }),
        ...(options?.ttl && { ttl: options.ttl }),
        ...(options?.meta && { meta: options.meta }),
      },
      payload,
    };

    const decision = selectTransport(frame, options?.delivery, this.rtcState());

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
    if (frame.header.resource !== "topic") return;

    if (frame.header.method === "peers" && frame.header.topic) {
      const subscribers: string[] = (frame.payload?.subscribers as string[]) ?? [];
      this.topicPeers.set(frame.header.topic, new Set(subscribers));
      return;
    }

    if (frame.header.method === "message" && frame.header.topic) {
      // Receiver-side validation: drop RTC messages for unsubscribed topics
      if (
        (frame.header as any).transport === "rtc" &&
        !this.subscriptions.has(frame.header.topic)
      ) {
        return;
      }

      const stream = this.topicStreams.get(frame.header.topic);
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
    return reliability === "unreliable" ? "starfish.stream" : "starfish.control";
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new StarfishError("NO_SESSION", "Not in a session. Call join() first.");
    }
    return session;
  }
}
