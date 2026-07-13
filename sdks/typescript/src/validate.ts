export function validateSerializable(value: unknown, label: string): void {
  const seen = new WeakSet();
  walk(value, label, seen);
}

function walk(value: unknown, path: string, seen: WeakSet<object>): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "function") {
    throw new Error(`${path} is a function and cannot be serialized`);
  }

  if (typeof value === "undefined") {
    throw new Error(`${path} is undefined and cannot be serialized`);
  }

  if (typeof value === "symbol") {
    throw new Error(`${path} is a symbol and cannot be serialized`);
  }

  if (typeof value === "bigint") {
    throw new Error(`${path} is a bigint and cannot be serialized`);
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) {
      throw new Error(`${path} contains a circular reference`);
    }
    seen.add(value as object);

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        walk(value[i], `${path}[${i}]`, seen);
      }
    } else {
      for (const key of Object.keys(value as Record<string, unknown>)) {
        walk((value as Record<string, unknown>)[key], `${path}.${key}`, seen);
      }
    }

    seen.delete(value as object);
  }
}
