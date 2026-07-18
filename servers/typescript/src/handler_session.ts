import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import {
  createErrorFrame,
  ERR_PROTOCOL_INVALID_FRAME,
  ERR_SESSION_NOT_FOUND,
} from "./errors.js";

type HandlerFunc = (client: Client, frame: StarfishFrame) => void;

type JoinPayload = {
  create?: boolean;
  name?: string;
  role?: string;
  meta?: unknown;
};

export function requireSession(
  hub: StarfishServer,
  fn: HandlerFunc,
): HandlerFunc {
  return (client: Client, frame: StarfishFrame) => {
    if (!frame.header.session || !client.sessions.has(frame.header.session)) {
      client.sendFrame(
        createErrorFrame(hub.idGen, frame.header.id, ERR_SESSION_NOT_FOUND, frame.header.resource, frame.header.method),
      );
      return;
    }
    fn(client, frame);
  };
}

export function handleSessionJoin(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  if (!frame.header.session) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_PROTOCOL_INVALID_FRAME, "session", "join"),
    );
    return;
  }

  const payload = (frame.payload ?? {}) as JoinPayload;

  let session = hub.getSession(frame.header.session);
  if (!session) {
    if (!payload.create) {
      client.sendFrame(
        createErrorFrame(hub.idGen, frame.header.id, ERR_SESSION_NOT_FOUND, "session", "join"),
      );
      return;
    }
    session = hub.getOrCreateSession(frame.header.session);
  }

  const clients = session.addClient(client);
  client.sessions.add(frame.header.session);

  if (payload.name) client.name = payload.name;
  if (payload.role) client.role = payload.role;
  if (payload.meta !== undefined) client.meta = payload.meta;

  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "session",
      method: "join",
      kind: "response",
      session: frame.header.session,
      replyTo: frame.header.id,
    },
    payload: { status: "ok", clientId: client.id, clients },
  });

  session.broadcast(
    {
      header: {
        id: hub.idGen.messageId(),
        resource: "session",
        method: "connected",
        kind: "event",
        session: frame.header.session,
      },
      payload: { client: client.info() },
    },
    client.id,
  );
}

export function handleSessionLeave(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  if (!frame.header.session) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_PROTOCOL_INVALID_FRAME, "session", "leave"),
    );
    return;
  }

  if (!client.sessions.has(frame.header.session)) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_SESSION_NOT_FOUND, "session", "leave"),
    );
    return;
  }

  removeClientFromSession(hub, client, frame.header.session, "left");

  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "session",
      method: "leave",
      kind: "response",
      session: frame.header.session,
      replyTo: frame.header.id,
    },
    payload: { status: "ok" },
  });
}

export function removeClientFromSession(
  hub: StarfishServer,
  client: Client,
  sessionName: string,
  reason: string,
): void {
  const session = hub.getSession(sessionName);
  if (!session) return;

  client.sessions.delete(sessionName);
  const empty = session.removeClient(client.id);

  session.broadcast({
    header: {
      id: hub.idGen.messageId(),
      resource: "session",
      method: "disconnected",
      kind: "event",
      session: sessionName,
    },
    payload: { clientId: client.id, reason },
  });

  if (empty) {
    hub.removeSession(sessionName);
  }
}
