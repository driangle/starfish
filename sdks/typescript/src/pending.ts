import { StarfishError, type StarfishFrame } from "./types.js";

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
        reject(
          new StarfishError("REQUEST_TIMEOUT", `Request ${messageId} timed out after ${timeout}ms`),
        );
      }, timeout);

      this.pending.set(messageId, { resolve, reject, timer });
    });
  }

  resolve(frame: StarfishFrame): boolean {
    if (!frame.header.replyTo) return false;

    const entry = this.pending.get(frame.header.replyTo);
    if (!entry) return false;

    this.pending.delete(frame.header.replyTo);
    clearTimeout(entry.timer);

    const error = (frame.payload as any)?.error;
    if ((frame.payload as any)?.status === "error" && error) {
      entry.reject(
        new StarfishError(
          error.code,
          error.message,
          error.resource,
          error.retry,
          (frame.payload as any).details,
        ),
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
