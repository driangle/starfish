import type { P5Instance } from "./types.js";

export function hookRemove(p5: P5Instance | undefined, onRemove: () => void): void {
  if (p5?.remove) {
    const originalRemove = p5.remove.bind(p5);
    p5.remove = () => {
      onRemove();
      originalRemove();
    };
    return;
  }

  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("beforeunload", onRemove);
  }
}
