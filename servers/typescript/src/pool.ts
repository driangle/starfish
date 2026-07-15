import type { IDGenerator } from "./id.js";

export type PoolMode = "auto" | "claim" | "mutual" | "propose" | "delegated";

export type PoolMember = {
  clientId: string;
  role: string;
  attributes: Record<string, unknown>;
  filter: Record<string, unknown> | undefined;
};

export type MatchResult = {
  session: string;
  peers: { id: string; attributes: Record<string, unknown> }[];
};

export class Pool {
  readonly name: string;
  readonly mode: PoolMode;
  readonly groupSize: number;

  private members = new Map<string, PoolMember>();
  private fifoQueue: string[] = [];
  private claims = new Map<string, Set<string>>();
  private proposals = new Map<string, string>(); // target -> proposer
  private matchCounter = 0;

  constructor(name: string, mode: PoolMode, groupSize: number) {
    this.name = name;
    this.mode = mode;
    this.groupSize = groupSize;
  }

  addMember(clientId: string, role: string, attributes: Record<string, unknown>, filter: Record<string, unknown> | undefined): void {
    this.members.set(clientId, { clientId, role, attributes, filter });
    if (this.mode === "auto") {
      this.fifoQueue.push(clientId);
    }
  }

  removeMember(clientId: string): boolean {
    this.members.delete(clientId);
    this.fifoQueue = this.fifoQueue.filter((id) => id !== clientId);
    this.removeClaims(clientId);
    this.removeProposalsFrom(clientId);
    this.removeProposalsTo(clientId);
    return this.members.size === 0;
  }

  getMember(clientId: string): PoolMember | undefined {
    return this.members.get(clientId);
  }

  hasMember(clientId: string): boolean {
    return this.members.has(clientId);
  }

  getMembers(): IterableIterator<PoolMember> {
    return this.members.values();
  }

  isMatchmaker(clientId: string): boolean {
    return this.members.get(clientId)?.role === "matchmaker";
  }

  getMemberList(excludeId?: string): { id: string; attributes: Record<string, unknown> }[] {
    const list: { id: string; attributes: Record<string, unknown> }[] = [];
    for (const m of this.members.values()) {
      if (m.clientId !== excludeId) {
        list.push({ id: m.clientId, attributes: m.attributes });
      }
    }
    return list;
  }

  isClaimBased(): boolean {
    return this.mode === "claim" || this.mode === "mutual" || this.mode === "propose";
  }

  tryAutoMatch(idGen: IDGenerator): MatchResult | undefined {
    if (this.mode !== "auto") return undefined;

    // Scan FIFO queue for a group of groupSize whose filters mutually satisfy
    for (let i = 0; i <= this.fifoQueue.length - this.groupSize; i++) {
      const candidate = [this.fifoQueue[i]];
      for (let j = i + 1; j < this.fifoQueue.length && candidate.length < this.groupSize; j++) {
        if (this.groupFiltersMatch(candidate, this.fifoQueue[j])) {
          candidate.push(this.fifoQueue[j]);
        }
      }
      if (candidate.length === this.groupSize) {
        return this.executeMatch(candidate, idGen);
      }
    }
    return undefined;
  }

  executeMatch(group: string[], idGen: IDGenerator): MatchResult {
    this.matchCounter++;
    const session = `pool_${this.name}_${idGen.messageId()}`;
    const peers: { id: string; attributes: Record<string, unknown> }[] = [];

    for (const id of group) {
      const member = this.members.get(id)!;
      peers.push({ id: member.clientId, attributes: member.attributes });
    }

    // Remove matched members
    for (const id of group) {
      this.members.delete(id);
      this.fifoQueue = this.fifoQueue.filter((fid) => fid !== id);
      this.removeClaims(id);
      this.removeProposalsFrom(id);
      this.removeProposalsTo(id);
    }

    return { session, peers };
  }

  addClaim(from: string, to: string): void {
    let set = this.claims.get(from);
    if (!set) {
      set = new Set();
      this.claims.set(from, set);
    }
    set.add(to);
  }

  hasClaim(from: string, to: string): boolean {
    return this.claims.get(from)?.has(to) ?? false;
  }

  addProposal(from: string, to: string): void {
    this.proposals.set(to, from);
  }

  getProposer(to: string): string | undefined {
    return this.proposals.get(to);
  }

  removeProposal(to: string): void {
    this.proposals.delete(to);
  }

  get isEmpty(): boolean {
    return this.members.size === 0;
  }

  private removeClaims(clientId: string): void {
    this.claims.delete(clientId);
    for (const [, set] of this.claims) {
      set.delete(clientId);
    }
  }

  private removeProposalsFrom(clientId: string): void {
    for (const [to, from] of this.proposals) {
      if (from === clientId) {
        this.proposals.delete(to);
      }
    }
  }

  private removeProposalsTo(clientId: string): void {
    this.proposals.delete(clientId);
  }

  private groupFiltersMatch(group: string[], candidateId: string): boolean {
    const candidate = this.members.get(candidateId)!;
    for (const existingId of group) {
      const existing = this.members.get(existingId)!;
      if (!this.filtersMatch(existing, candidate)) {
        return false;
      }
    }
    return true;
  }

  private filtersMatch(a: PoolMember, b: PoolMember): boolean {
    return this.evaluateFilter(a.filter, a.attributes, b.attributes) &&
      this.evaluateFilter(b.filter, b.attributes, a.attributes);
  }

  private evaluateFilter(
    filter: Record<string, unknown> | undefined,
    selfAttrs: Record<string, unknown>,
    targetAttrs: Record<string, unknown>,
  ): boolean {
    if (!filter) return true;
    for (const [key, value] of Object.entries(filter)) {
      const resolved = value === "@self" ? selfAttrs[key] : value;
      if (!(key in targetAttrs)) return false;
      if (targetAttrs[key] !== resolved) return false;
    }
    return true;
  }
}
