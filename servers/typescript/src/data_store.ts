export type DataEntry = {
  data: unknown;
  version: number;
  updatedBy: string;
};

export class ConflictError extends Error {
  readonly actualVersion: number;
  readonly currentData: unknown;

  constructor(actualVersion: number, currentData: unknown) {
    super(`version conflict: actual version is ${actualVersion}`);
    this.actualVersion = actualVersion;
    this.currentData = currentData;
  }
}

const EMPTY_ENTRY: DataEntry = { data: undefined, version: 0, updatedBy: "" };

export class DataStore {
  private session = new Map<string, DataEntry>();
  private client = new Map<string, Map<string, DataEntry>>();

  apply(
    op: string,
    key: string,
    scope: string,
    clientId: string,
    data: unknown,
    expectedVersion?: number,
  ): DataEntry {
    const store = this.storeForScope(scope, clientId);
    const existing = store.get(key) ?? EMPTY_ENTRY;

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new ConflictError(existing.version, existing.data);
    }

    if (op === "delete") {
      store.delete(key);
      return { data: undefined, version: existing.version + 1, updatedBy: clientId };
    }

    const newData = applyOp(op, existing.data, data);
    const entry: DataEntry = {
      data: newData,
      version: existing.version + 1,
      updatedBy: clientId,
    };
    store.set(key, entry);
    return entry;
  }

  get(key: string, scope: string, clientId: string): DataEntry {
    const store = this.storeForScope(scope, clientId);
    return store.get(key) ?? EMPTY_ENTRY;
  }

  private storeForScope(scope: string, clientId: string): Map<string, DataEntry> {
    if (scope === "self") {
      let clientStore = this.client.get(clientId);
      if (!clientStore) {
        clientStore = new Map();
        this.client.set(clientId, clientStore);
      }
      return clientStore;
    }
    return this.session;
  }
}

function applyOp(op: string, existing: unknown, incoming: unknown): unknown {
  switch (op) {
    case "replace":
      return incoming;
    case "merge":
      return mergeObjects(existing, incoming);
    case "set.add":
      return setAdd(existing, incoming);
    case "set.remove":
      return setRemove(existing, incoming);
    case "list.add":
      return listAdd(existing, incoming);
    case "list.remove":
      return listRemove(existing, incoming);
    case "counter.add":
      return counterAdd(existing, incoming);
    default:
      throw new Error(`invalid operation: ${op}`);
  }
}

function mergeObjects(existing: unknown, incoming: unknown): unknown {
  if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) {
    throw new Error("merge requires an object");
  }
  const base: Record<string, unknown> =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...(incoming as Record<string, unknown>) };
}

function setAdd(existing: unknown, incoming: unknown): unknown[] {
  const set: unknown[] = Array.isArray(existing) ? [...existing] : [];
  const inStr = JSON.stringify(incoming);
  for (const item of set) {
    if (JSON.stringify(item) === inStr) return set;
  }
  set.push(incoming);
  return set;
}

function setRemove(existing: unknown, incoming: unknown): unknown[] {
  const set: unknown[] = Array.isArray(existing) ? existing : [];
  const inStr = JSON.stringify(incoming);
  return set.filter((item) => JSON.stringify(item) !== inStr);
}

function listAdd(existing: unknown, incoming: unknown): unknown[] {
  const list: unknown[] = Array.isArray(existing) ? [...existing] : [];
  list.push(incoming);
  return list;
}

function listRemove(existing: unknown, incoming: unknown): unknown[] {
  const list: unknown[] = Array.isArray(existing) ? existing : [];
  const inStr = JSON.stringify(incoming);
  return list.filter((item) => JSON.stringify(item) !== inStr);
}

function counterAdd(existing: unknown, incoming: unknown): number {
  const current = typeof existing === "number" ? existing : 0;
  if (typeof incoming !== "number") {
    throw new Error("counter.add requires a number");
  }
  return current + incoming;
}
