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

export function getMousePosition(p5: P5Instance | undefined): { x: number; y: number } | null {
  if (p5) {
    return { x: p5.mouseX, y: p5.mouseY };
  }

  const g = globalThis as any;
  if (typeof g.mouseX === "number" && typeof g.mouseY === "number") {
    return { x: g.mouseX, y: g.mouseY };
  }

  return null;
}
