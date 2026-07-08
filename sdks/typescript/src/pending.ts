import type { StarfishFrame } from "./types.js";

interface PendingEntry {
  resolve: (frame: StarfishFrame) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class PendingRequests {
  private pending = new Map<string, PendingEntry>();

  add(messageId: string, timeout: number): Promise<StarfishFrame> {
    return new Promise<StarfishFrame>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error(`Request ${messageId} timed out after ${timeout}ms`));
      }, timeout);

      this.pending.set(messageId, { resolve, reject, timer });
    });
  }

  resolve(frame: StarfishFrame): boolean {
    if (!frame.replyTo) return false;

    const entry = this.pending.get(frame.replyTo);
    if (!entry) return false;

    this.pending.delete(frame.replyTo);
    clearTimeout(entry.timer);

    if (frame.type === "error" && frame.error) {
      entry.reject(
        Object.assign(new Error(frame.error.message), {
          code: frame.error.code,
          details: frame.error.details,
        }),
      );
    } else {
      entry.resolve(frame);
    }

    return true;
  }

  rejectAll(error: Error): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }
}
