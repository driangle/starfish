import type { Connection } from "./connection.js";
import { nextId } from "./id.js";

const DEFAULT_SAMPLE_COUNT = 5;

export class Clock {
  private connection: Connection;
  private _offset = 0;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  get offset(): number {
    return this._offset;
  }

  now(): number {
    return Date.now() + this._offset;
  }

  async sync(samples = DEFAULT_SAMPLE_COUNT): Promise<number> {
    const offsets: number[] = [];

    for (let i = 0; i < samples; i++) {
      const t1 = Date.now();
      const response = await this.connection.sendAndWait({
        header: {
          id: nextId("clock"),
          resource: "clock",
          method: "sync",
          kind: "request",
          ts: t1,
        },
      });
      const t4 = Date.now();

      const serverTime = response.payload?.serverTime as number;
      if (serverTime) {
        const rtt = t4 - t1;
        const estimatedServerTime = serverTime + rtt / 2;
        offsets.push(estimatedServerTime - t4);
      }
    }

    if (offsets.length > 0) {
      offsets.sort((a, b) => a - b);
      this._offset = offsets[Math.floor(offsets.length / 2)];
    }

    return this._offset;
  }

  at(serverTime: number, callback: () => void): ReturnType<typeof setTimeout> {
    const localTime = serverTime - this._offset;
    const delay = Math.max(0, localTime - Date.now());
    return setTimeout(callback, delay);
  }
}
