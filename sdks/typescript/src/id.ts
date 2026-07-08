let counter = 0;

export function nextId(prefix = "msg"): string {
  return `${prefix}_${++counter}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
