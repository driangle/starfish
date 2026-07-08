import type { StarfishFrame, FrameOptions } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { EventStream } from "./emitter.js";
import { validateTopicName } from "./limits.js";

export class Topics {
  private connection: Connection;
  private session: Session;
  private topicStreams = new Map<string, EventStream<StarfishFrame>>();
  private subscriptions = new Set<string>();

  constructor(connection: Connection, session: Session) {
    this.connection = connection;
    this.session = session;
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

    this.connection.send(frame);
  }

  topic$(topic: string): EventStream<StarfishFrame> {
    let stream = this.topicStreams.get(topic);
    if (!stream) {
      stream = new EventStream<StarfishFrame>();
      this.topicStreams.set(topic, stream);
    }
    return stream;
  }

  handleFrame(frame: StarfishFrame): void {
    if (frame.type === "topic.message" && frame.topic) {
      const stream = this.topicStreams.get(frame.topic);
      if (stream) {
        stream.emit(frame);
      }
    }
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new Error("Not in a session. Call join() first.");
    }
    return session;
  }
}
