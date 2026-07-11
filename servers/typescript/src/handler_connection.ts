import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import type { ResumeEntry } from "./resume.js";
import { createErrorFrame, ERR_RESUME_INVALID, ERR_PAYLOAD_TOO_LARGE } from "./errors.js";
import { MAX_CLIENT_META_SIZE } from "./limits.js";

type HelloPayload = {
  client?: { name?: string; role?: string; meta?: unknown };
  capabilities?: { rtc?: boolean };
  resumeToken?: string;
};

type WelcomePayload = {
  clientId: string;
  resumed?: boolean;
  resumeToken: string;
  resumeTimeout: number;
  serverTime: number;
  heartbeatInterval: number;
  sessionRequired: boolean;
  sessions?: string[];
  rtc?: { iceServers: Array<{ urls: string }> };
};

export function handleClientHello(
  hub: Hub,
  client: Client,
  frame: StarfishFrame,
): void {
  let payload: HelloPayload = {};
  if (frame.payload !== undefined) {
    payload = frame.payload as HelloPayload;
  }

  if (payload.resumeToken) {
    handleResume(hub, client, frame, payload.resumeToken);
    return;
  }

  handleFreshHello(hub, client, frame, payload);
}

function handleResume(
  hub: Hub,
  client: Client,
  frame: StarfishFrame,
  token: string,
): void {
  const entry = hub.resumes.restore(token);
  if (!entry) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_RESUME_INVALID),
    );
    return;
  }

  restoreClient(client, entry);
  hub.registerClient(client);
  rejoinSessions(hub, client, entry);

  const newToken = hub.idGen.resumeToken();
  hub.resumes.registerToken(client, newToken);

  sendWelcome(hub, client, frame, {
    clientId: client.id,
    resumed: true,
    resumeToken: newToken,
    sessions: [...client.sessions],
  });
}

function handleFreshHello(
  hub: Hub,
  client: Client,
  frame: StarfishFrame,
  payload: HelloPayload,
): void {
  const clientId = hub.idGen.clientId();
  const resumeToken = hub.idGen.resumeToken();

  client.id = clientId;
  if (payload.client) {
    if (payload.client.meta !== undefined) {
      const metaSize = JSON.stringify(payload.client.meta).length;
      if (metaSize > MAX_CLIENT_META_SIZE) {
        client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_PAYLOAD_TOO_LARGE));
        return;
      }
    }
    client.name = payload.client.name ?? "";
    client.role = payload.client.role ?? "";
    client.meta = payload.client.meta;
  }
  if (payload.capabilities) {
    client.rtcCapable = payload.capabilities.rtc === true;
  }
  client.authenticated = true;
  client.lastActivity = Date.now();

  hub.registerClient(client);
  hub.resumes.registerToken(client, resumeToken);

  sendWelcome(hub, client, frame, {
    clientId,
    resumeToken,
    sessionRequired: true,
  });
}

function restoreClient(client: Client, entry: ResumeEntry): void {
  client.id = entry.clientId;
  client.name = entry.name;
  client.role = entry.role;
  client.meta = entry.meta;
  client.rtcCapable = entry.rtcCapable;
  client.sessions = entry.sessions;
  client.topics = entry.topics;
  client.authenticated = true;
  client.lastActivity = Date.now();
}

function rejoinSessions(hub: Hub, client: Client, entry: ResumeEntry): void {
  for (const sessName of client.sessions) {
    const sess = hub.getSession(sessName);
    if (!sess) continue;

    sess.addClient(client);

    const topicSet = client.topics.get(sessName);
    if (topicSet) {
      for (const topic of topicSet) {
        sess.subscribe(topic, client);
      }
    }

    const presenceData = entry.presence.get(sessName);
    if (presenceData !== undefined) {
      sess.setPresence(client.id, presenceData);
    }
  }
}

function sendWelcome(
  hub: Hub,
  client: Client,
  frame: StarfishFrame,
  extra: Partial<WelcomePayload>,
): void {
  const now = Date.now();
  const welcome: WelcomePayload = {
    clientId: client.id,
    resumeToken: "",
    resumeTimeout: hub.config.resumeTimeoutMs,
    serverTime: now,
    heartbeatInterval: hub.config.heartbeatIntervalMs,
    sessionRequired: false,
    ...extra,
  };

  if (hub.config.iceServers.length > 0) {
    welcome.rtc = { iceServers: hub.config.iceServers };
  }

  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "server.welcome",
    ts: now,
    replyTo: frame.id,
    payload: welcome,
  });
}
