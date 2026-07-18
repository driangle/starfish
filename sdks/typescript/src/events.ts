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
      if (filter.resource && frame.header.resource !== filter.resource) return;
      if (filter.method && frame.header.method !== filter.method) return;
      if (filter.topic && frame.header.topic !== filter.topic) return;
      if (filter.from && frame.header.from !== filter.from) return;
      filtered.emit(frame);
    });

    return filtered;
  }

  subscribe(callback: (frame: StarfishFrame) => void): Unsubscribe {
    return this.stream.subscribe(callback);
  }
}
