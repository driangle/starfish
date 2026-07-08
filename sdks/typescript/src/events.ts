import type { StarfishFrame, EventFilter } from "./types.js";
import { EventStream, type Unsubscribe } from "./emitter.js";

export class Events {
  private stream = new EventStream<StarfishFrame>();

  dispatch(frame: StarfishFrame): void {
    this.stream.emit(frame);
  }

  events$(filter?: EventFilter): EventStream<StarfishFrame> {
    if (!filter) return this.stream;

    const filtered = new EventStream<StarfishFrame>();

    this.stream.subscribe((frame) => {
      if (filter.type && frame.type !== filter.type) return;
      if (filter.topic && frame.topic !== filter.topic) return;
      if (filter.from && frame.from !== filter.from) return;
      filtered.emit(frame);
    });

    return filtered;
  }

  subscribe(callback: (frame: StarfishFrame) => void): Unsubscribe {
    return this.stream.subscribe(callback);
  }
}
