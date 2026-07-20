import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import type { ResumeEntry } from "./resume.js";
import { createErrorFrame, ERR_PAYLOAD_TOO_LARGE, ERR_PROTOCOL_UNSUPPORTED_VERSION } from "./errors.js";
import { MAX_CLIENT_META_SIZE } from "./limits.js";

const SUPPORTED_VERSIONS = [1];

type HelloPayload = {
  versions?: number[];
  client?: { name?: string; role?: string; meta?: unknown };
  capabilities?: { rtc?: boolean };
  resumeToken?: string;
  auth?: { type?: string };
};

type WelcomePayload = {
  status: string;
  version: number;
  clientId: string;
  resumed?: boolean;
  resumeToken: string;
  resumeTimeout: number;
  serverTime: number;
  heartbeatInterval: number;
  sessionRequired: boolean;
  sessions?: string[];
  pools?: string[];
  rtc?: { iceServers: Array<{ urls: string }> };
};

function negotiateVersion(clientVersions: number[]): number | undefined {
  // A client that offers no versions (e.g. a resume hello) is accepted at the
  // default supported version for backwards compatibility.
  if (clientVersions.length === 0) return SUPPORTED_VERSIONS[0];
  for (const v of clientVersions) {
    if (SUPPORTED_VERSIONS.includes(v)) return v;
  }
  return undefined;
}

export function handleClientHello(
  hub: StarfishServer,
  client: Client,
  frame: StarfishFrame,
): void {
  const payload = (frame.payload ?? {}) as HelloPayload;

  const clientVersions = payload.versions ?? [];
  const negotiated = negotiateVersion(clientVersions);
  if (negotiated === undefined) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_PROTOCOL_UNSUPPORTED_VERSION, "client", "welcome"),
    );
    return;
  }

  if (payload.resumeToken) {
    const resumed = handleResume(hub, client, frame, payload.resumeToken, negotiated);
    if (resumed) return;
  }

  handleFreshHello(hub, client, frame, payload, negotiated);
}

function handleResume(
  hub: StarfishServer,
  client: Client,
  frame: StarfishFrame,
  token: string,
  version: number,
): boolean {
  const entry = hub.resumes.restore(token);
  if (!entry) {
    return false;
  }

  restoreClient(client, entry);
  hub.registerClient(client);
  rejoinSessions(hub, client, entry);

  const newToken = hub.idGen.resumeToken();
  hub.resumes.registerToken(client, newToken);

  sendWelcome(hub, client, frame, version, {
    clientId: client.id,
    resumed: true,
    resumeToken: newToken,
    sessions: [...client.sessions],
    pools: [...client.pools],
  });

  return true;
}

function handleFreshHello(
  hub: StarfishServer,
  client: Client,
  frame: StarfishFrame,
  payload: HelloPayload,
  version: number,
): void {
  const clientId = hub.idGen.clientId();
  const resumeToken = hub.idGen.resumeToken();

  client.id = clientId;
  if (payload.client) {
    if (payload.client.meta !== undefined) {
      const metaSize = JSON.stringify(payload.client.meta).length;
      if (metaSize > MAX_CLIENT_META_SIZE) {
        client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_PAYLOAD_TOO_LARGE, "client", "welcome"));
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

  sendWelcome(hub, client, frame, version, {
    clientId,
    resumeToken,
    sessionRequired: true,
  });
}

function restoreClient(client: Client, entry: ResumeEntry): void {
  Object.assign(client, {
    id: entry.clientId, name: entry.name, role: entry.role, meta: entry.meta,
    rtcCapable: entry.rtcCapable, sessions: entry.sessions, topics: entry.topics,
    authenticated: true, lastActivity: Date.now(),
  });
}

function rejoinSessions(hub: StarfishServer, client: Client, entry: ResumeEntry): void {
  for (const sessName of client.sessions) {
    const sess = hub.getSession(sessName);
    if (!sess) continue;
    sess.addClient(client);
    const topicSet = client.topics.get(sessName);
    if (topicSet) {
      for (const topic of topicSet) sess.subscribe(topic, client);
    }
    const presenceData = entry.presence.get(sessName);
    if (presenceData !== undefined) sess.setPresence(client.id, presenceData);
  }
}

function sendWelcome(
  hub: StarfishServer,
  client: Client,
  frame: StarfishFrame,
  version: number,
  extra: Partial<WelcomePayload>,
): void {
  const now = Date.now();
  const welcomePayload: WelcomePayload = {
    status: "ok",
    version,
    clientId: client.id,
    resumeToken: "",
    resumeTimeout: hub.config.resumeTimeoutMs,
    serverTime: now,
    heartbeatInterval: hub.config.heartbeatIntervalMs,
    sessionRequired: false,
    ...extra,
  };

  if (hub.config.iceServers.length > 0) {
    welcomePayload.rtc = { iceServers: hub.config.iceServers };
  }

  client.sendFrame({
    header: {
      v: 1,
      id: hub.idGen.messageId(),
      resource: "client",
      method: "welcome",
      kind: "response",
      ts: now,
      replyTo: frame.header.id,
    },
    payload: welcomePayload as unknown as Record<string, unknown>,
  });
}
