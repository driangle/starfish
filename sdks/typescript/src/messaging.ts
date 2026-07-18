import { StarfishError, type StarfishFrame, type HeaderOptions } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import type { RTC } from "./rtc.js";
import { selectTransport, type RTCState } from "./transport.js";
import { EventStream } from "./emitter.js";
import { nextId } from "./id.js";

export class Messaging {
  private connection: Connection;
  private session: Session;
  private rtc: RTC | null;

  readonly messages$ = new EventStream<StarfishFrame>();

  constructor(connection: Connection, session: Session, rtc: RTC | null = null) {
    this.connection = connection;
    this.session = session;
    this.rtc = rtc;
  }

  handleFrame(frame: StarfishFrame): void {
    if (frame.header.resource === "message" && frame.header.method === "message") {
      this.messages$.emit(frame);
    }
  }

  messagesFrom$(peerId: string): EventStream<StarfishFrame> {
    const filtered = new EventStream<StarfishFrame>();
    this.messages$.subscribe((frame) => {
      if (frame.header.from === peerId) {
        filtered.emit(frame);
      }
    });
    return filtered;
  }

  send(to: string | string[], payload: any, options?: HeaderOptions): void {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      header: {
        id: nextId("send"),
        resource: "message",
        method: "send",
        kind: "request",
        session: sessionName,
        to,
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

  broadcast(payload: any, options?: HeaderOptions): void {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      header: {
        id: nextId("bcast"),
        resource: "session",
        method: "broadcast",
        kind: "request",
        session: sessionName,
        ...(options?.delivery && { delivery: options.delivery }),
        ...(options?.priority && { priority: options.priority }),
        ...(options?.ttl && { ttl: options.ttl }),
        ...(options?.meta && { meta: options.meta }),
      },
      payload,
    };

    // Broadcast always goes via WS (spec: unless RTC mesh enabled, which we don't support yet)
    this.connection.send(frame);
  }

  private rtcState(): RTCState | null {
    if (!this.rtc) return null;
    const rtc = this.rtc;
    return {
      isPeerConnected: (peerId) => rtc.isPeerConnected(peerId),
      getConnectedPeerIds: () => rtc.getConnectedPeerIds(),
      getTopicPeers: () => [],
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
