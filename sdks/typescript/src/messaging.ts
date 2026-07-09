import type { StarfishFrame, FrameOptions } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import type { RTC } from "./rtc.js";
import { selectTransport, type RTCState } from "./transport.js";
import { nextId } from "./id.js";

export class Messaging {
  private connection: Connection;
  private session: Session;
  private rtc: RTC | null;

  constructor(connection: Connection, session: Session, rtc: RTC | null = null) {
    this.connection = connection;
    this.session = session;
    this.rtc = rtc;
  }

  send(to: string | string[], payload: any, options?: FrameOptions): void {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("send"),
      type: "client.send",
      session: sessionName,
      to,
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

  broadcast(payload: any, options?: FrameOptions): void {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("bcast"),
      type: "session.broadcast",
      session: sessionName,
      payload,
      ...(options && { options }),
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
