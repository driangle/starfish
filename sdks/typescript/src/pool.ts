import { StarfishError, type StarfishFrame } from "./types.js";
import type { PoolEnterOptions, PoolMatchedEvent, PoolMember } from "./pool-types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { Observable, EventStream } from "./emitter.js";

export class Pool {
  private connection: Connection;
  private session: Session;
  private currentPool: string | null = null;
  private membersMap = new Map<string, PoolMember>();

  readonly members$ = new Observable<PoolMember[]>([]);
  readonly matched$ = new EventStream<PoolMatchedEvent>();
  readonly proposal$ = new EventStream<{
    pool: string;
    from: string;
    attributes?: Record<string, unknown>;
  }>();
  readonly claimRejected$ = new EventStream<{ pool: string; target: string }>();

  constructor(connection: Connection, session: Session) {
    this.connection = connection;
    this.session = session;
  }

  async enter(poolName: string, options: PoolEnterOptions): Promise<StarfishFrame> {
    this.requireSession();

    const frame: StarfishFrame = {
      header: {
        id: nextId("pool"),
        resource: "pool",
        method: "enter",
        kind: "request",
      },
      payload: {
        pool: poolName,
        groupSize: options.groupSize,
        mode: options.mode,
        role: options.role,
        attributes: options.attributes,
        filter: options.filter,
        create: options.create,
      },
    };

    const response = await this.connection.sendAndWait(frame);
    this.currentPool = poolName;

    if (response.payload?.members) {
      for (const member of response.payload.members as PoolMember[]) {
        this.membersMap.set(member.id, member);
      }
      this.members$.set([...this.membersMap.values()]);
    }

    return response;
  }

  leave(poolName: string): void {
    this.requireSession();

    const frame: StarfishFrame = {
      header: {
        id: nextId("pool"),
        resource: "pool",
        method: "leave",
        kind: "request",
      },
      payload: { pool: poolName },
    };

    this.connection.send(frame);

    if (this.currentPool === poolName) {
      this.clearState();
    }
  }

  claim(poolName: string, targetId: string): void {
    this.sendPoolRequest("claim", { pool: poolName, target: targetId });
  }

  accept(poolName: string, fromId: string): void {
    this.sendPoolRequest("accept", { pool: poolName, from: fromId });
  }

  reject(poolName: string, fromId: string): void {
    this.sendPoolRequest("reject", { pool: poolName, from: fromId });
  }

  async assign(poolName: string, groups: string[][]): Promise<StarfishFrame> {
    this.requireSession();

    const frame: StarfishFrame = {
      header: {
        id: nextId("pool"),
        resource: "pool",
        method: "assign",
        kind: "request",
      },
      payload: { pool: poolName, groups },
    };

    return this.connection.sendAndWait(frame);
  }

  handleFrame(frame: StarfishFrame): void {
    if (frame.header.resource !== "pool") return;

    const pool = frame.payload?.pool as string | undefined;
    if (!pool || pool !== this.currentPool) return;

    switch (frame.header.method) {
      case "member-joined": {
        const member = frame.payload!.member as PoolMember;
        this.membersMap.set(member.id, member);
        this.members$.set([...this.membersMap.values()]);
        break;
      }
      case "member-left": {
        const memberId = frame.payload!.memberId as string;
        this.membersMap.delete(memberId);
        this.members$.set([...this.membersMap.values()]);
        break;
      }
      case "matched":
        this.matched$.emit({
          pool,
          session: frame.payload!.session as string,
          peers: frame.payload!.peers as PoolMember[],
        });
        this.clearState();
        break;
      case "proposal":
        this.proposal$.emit({
          pool,
          from: frame.payload!.from as string,
          attributes: frame.payload!.attributes as Record<string, unknown> | undefined,
        });
        break;
      case "claim-rejected":
        this.claimRejected$.emit({
          pool,
          target: frame.payload!.target as string,
        });
        break;
    }
  }

  clear(): void {
    this.clearState();
  }

  private sendPoolRequest(method: string, payload: Record<string, unknown>): void {
    this.requireSession();
    this.connection.send({
      header: { id: nextId("pool"), resource: "pool", method, kind: "request" },
      payload,
    });
  }

  private clearState(): void {
    this.currentPool = null;
    this.membersMap.clear();
    this.members$.set([]);
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new StarfishError("NO_SESSION", "Not in a session. Call join() first.");
    }
    return session;
  }
}
