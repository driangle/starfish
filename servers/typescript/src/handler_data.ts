import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { ConflictError } from "./data_store.js";
import {
  createErrorFrame,
  ERR_PROTOCOL_INVALID_FRAME,
  ERR_PAYLOAD_TOO_LARGE,
  ERR_DATA_INVALID_OP,
  ERR_DATA_CONFLICT,
} from "./errors.js";
import { MAX_DATA_VALUE_SIZE } from "./limits.js";

type DataSavePayload = {
  key: string;
  scope: string;
  op: string;
  data: unknown;
  expectedVersion?: number;
};

type DataGetPayload = {
  key: string;
  scope: string;
};

export function handleDataSave(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const payload = frame.payload as DataSavePayload | undefined;
  if (
    !payload ||
    !payload.key ||
    (payload.scope !== "session" && payload.scope !== "self")
  ) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_PROTOCOL_INVALID_FRAME, "data", "save"));
    return;
  }

  const dataSize = JSON.stringify(payload.data ?? null).length;
  if (dataSize > MAX_DATA_VALUE_SIZE) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_PAYLOAD_TOO_LARGE, "data", "save"));
    return;
  }

  const session = hub.getSession(frame.header.session!)!;

  let entry;
  try {
    entry = session.data.apply(
      payload.op,
      payload.key,
      payload.scope,
      client.id,
      payload.data,
      payload.expectedVersion,
    );
  } catch (err) {
    if (err instanceof ConflictError) {
      client.sendFrame(
        createErrorFrame(hub.idGen, frame.header.id, ERR_DATA_CONFLICT, "data", "save", {
          key: payload.key,
          expectedVersion: payload.expectedVersion,
          actualVersion: err.actualVersion,
          currentData: err.currentData,
        }),
      );
      return;
    }
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_DATA_INVALID_OP, "data", "save"));
    return;
  }

  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "data",
      method: "save",
      kind: "response",
      session: frame.header.session,
      replyTo: frame.header.id,
    },
    payload: {
      status: "ok",
      key: payload.key,
      scope: payload.scope,
      data: entry.data,
      version: entry.version,
    },
  });

  if (payload.scope === "session") {
    session.broadcast(
      {
        header: {
          id: hub.idGen.messageId(),
          resource: "data",
          method: "changed",
          kind: "event",
          session: frame.header.session,
        },
        payload: {
          key: payload.key,
          scope: payload.scope,
          op: payload.op,
          data: entry.data,
          version: entry.version,
          updatedBy: client.id,
        },
      },
      "",
    );
  }
}

export function handleDataGet(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const payload = frame.payload as DataGetPayload | undefined;
  if (
    !payload ||
    !payload.key ||
    (payload.scope !== "session" && payload.scope !== "self")
  ) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_PROTOCOL_INVALID_FRAME, "data", "get"));
    return;
  }

  const session = hub.getSession(frame.header.session!)!;
  const entry = session.data.get(payload.key, payload.scope, client.id);

  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "data",
      method: "get",
      kind: "response",
      session: frame.header.session,
      replyTo: frame.header.id,
    },
    payload: {
      status: "ok",
      key: payload.key,
      scope: payload.scope,
      data: entry.data,
      version: entry.version,
    },
  });
}
