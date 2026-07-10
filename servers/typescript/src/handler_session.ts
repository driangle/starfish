import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
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
  hub: Hub,
  fn: HandlerFunc,
): HandlerFunc {
  return (client: Client, frame: StarfishFrame) => {
    if (!frame.session || !client.sessions.has(frame.session)) {
      client.sendFrame(
        createErrorFrame(hub.idGen, frame.id, ERR_SESSION_NOT_FOUND),
      );
      return;
    }
    fn(client, frame);
  };
}

export function handleSessionJoin(hub: Hub, client: Client, frame: StarfishFrame): void {
  if (!frame.session) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_PROTOCOL_INVALID_FRAME),
    );
    return;
  }

  const payload = (frame.payload ?? {}) as JoinPayload;

  let session = hub.getSession(frame.session);
  if (!session) {
    if (!payload.create) {
      client.sendFrame(
        createErrorFrame(hub.idGen, frame.id, ERR_SESSION_NOT_FOUND),
      );
      return;
    }
    session = hub.getOrCreateSession(frame.session);
  }

  const clients = session.addClient(client);
  client.sessions.add(frame.session);

  if (payload.name) client.name = payload.name;
  if (payload.role) client.role = payload.role;
  if (payload.meta !== undefined) client.meta = payload.meta;

  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "session.joined",
    session: frame.session,
    replyTo: frame.id,
    payload: { clientId: client.id, clients },
  });

  session.broadcast(
    {
      v: 1,
      id: hub.idGen.messageId(),
      type: "client.connected",
      session: frame.session,
      payload: { client: client.info() },
    },
    client.id,
  );
}

export function handleSessionLeave(hub: Hub, client: Client, frame: StarfishFrame): void {
  if (!frame.session) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_PROTOCOL_INVALID_FRAME),
    );
    return;
  }

  if (!client.sessions.has(frame.session)) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_SESSION_NOT_FOUND),
    );
    return;
  }

  removeClientFromSession(hub, client, frame.session, "left");

  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "session.left",
    session: frame.session,
    replyTo: frame.id,
  });
}

export function removeClientFromSession(
  hub: Hub,
  client: Client,
  sessionName: string,
  reason: string,
): void {
  const session = hub.getSession(sessionName);
  if (!session) return;

  client.sessions.delete(sessionName);
  const empty = session.removeClient(client.id);

  session.broadcast({
    v: 1,
    id: hub.idGen.messageId(),
    type: "client.disconnected",
    session: sessionName,
    payload: { clientId: client.id, reason },
  });

  if (empty) {
    hub.removeSession(sessionName);
  }
}
