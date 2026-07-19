from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .id import IDGenerator

PoolMode = str  # "auto" | "claim" | "mutual" | "propose" | "delegated"


@dataclass
class PoolMember:
    client_id: str
    role: str
    attributes: dict[str, Any]
    filter: dict[str, Any] | None


@dataclass
class MatchResult:
    session: str
    peers: list[dict[str, Any]]


class Pool:
    def __init__(self, name: str, mode: PoolMode, group_size: int) -> None:
        self.name = name
        self.mode = mode
        self.group_size = group_size

        self._members: dict[str, PoolMember] = {}
        self._fifo_queue: list[str] = []
        self._claims: dict[str, set[str]] = {}
        self._proposals: dict[str, str] = {}  # target -> proposer
        self._match_counter = 0

    def add_member(
        self,
        client_id: str,
        role: str,
        attributes: dict[str, Any],
        filter: dict[str, Any] | None,
    ) -> None:
        self._members[client_id] = PoolMember(
            client_id=client_id, role=role, attributes=attributes, filter=filter
        )
        if self.mode == "auto":
            self._fifo_queue.append(client_id)

    def remove_member(self, client_id: str) -> bool:
        self._members.pop(client_id, None)
        self._fifo_queue = [id for id in self._fifo_queue if id != client_id]
        self._remove_claims(client_id)
        self._remove_proposals_from(client_id)
        self._remove_proposals_to(client_id)
        return len(self._members) == 0

    def get_member(self, client_id: str) -> PoolMember | None:
        return self._members.get(client_id)

    def has_member(self, client_id: str) -> bool:
        return client_id in self._members

    def get_members(self) -> list[PoolMember]:
        return list(self._members.values())

    def is_matchmaker(self, client_id: str) -> bool:
        member = self._members.get(client_id)
        return member is not None and member.role == "matchmaker"

    def get_member_list(self, exclude_id: str | None = None) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for m in self._members.values():
            if m.client_id != exclude_id:
                result.append({"id": m.client_id, "attributes": m.attributes})
        return result

    def is_claim_based(self) -> bool:
        return self.mode in ("claim", "mutual", "propose")

    def try_auto_match(self, id_gen: IDGenerator) -> MatchResult | None:
        if self.mode != "auto":
            return None

        for i in range(len(self._fifo_queue) - self.group_size + 1):
            candidate = [self._fifo_queue[i]]
            for j in range(i + 1, len(self._fifo_queue)):
                if len(candidate) >= self.group_size:
                    break
                if self._group_filters_match(candidate, self._fifo_queue[j]):
                    candidate.append(self._fifo_queue[j])
            if len(candidate) == self.group_size:
                return self.execute_match(candidate, id_gen)
        return None

    def execute_match(self, group: list[str], id_gen: IDGenerator) -> MatchResult:
        self._match_counter += 1
        session = f"pool_{self.name}_{id_gen.message_id()}"
        peers: list[dict[str, Any]] = []

        for cid in group:
            member = self._members[cid]
            peers.append({"id": member.client_id, "attributes": member.attributes})

        for cid in group:
            self._members.pop(cid, None)
            self._fifo_queue = [fid for fid in self._fifo_queue if fid != cid]
            self._remove_claims(cid)
            self._remove_proposals_from(cid)
            self._remove_proposals_to(cid)

        return MatchResult(session=session, peers=peers)

    def add_claim(self, from_id: str, to_id: str) -> None:
        if from_id not in self._claims:
            self._claims[from_id] = set()
        self._claims[from_id].add(to_id)

    def has_claim(self, from_id: str, to_id: str) -> bool:
        claims = self._claims.get(from_id)
        return claims is not None and to_id in claims

    def add_proposal(self, from_id: str, to_id: str) -> None:
        self._proposals[to_id] = from_id

    def get_proposer(self, to_id: str) -> str | None:
        return self._proposals.get(to_id)

    def remove_proposal(self, to_id: str) -> None:
        self._proposals.pop(to_id, None)

    @property
    def is_empty(self) -> bool:
        return len(self._members) == 0

    def _remove_claims(self, client_id: str) -> None:
        self._claims.pop(client_id, None)
        for s in self._claims.values():
            s.discard(client_id)

    def _remove_proposals_from(self, client_id: str) -> None:
        to_remove = [to for to, from_id in self._proposals.items() if from_id == client_id]
        for to in to_remove:
            del self._proposals[to]

    def _remove_proposals_to(self, client_id: str) -> None:
        self._proposals.pop(client_id, None)

    def _group_filters_match(self, group: list[str], candidate_id: str) -> bool:
        candidate = self._members[candidate_id]
        for existing_id in group:
            existing = self._members[existing_id]
            if not self._filters_match(existing, candidate):
                return False
        return True

    def _filters_match(self, a: PoolMember, b: PoolMember) -> bool:
        return self._evaluate_filter(a.filter, a.attributes, b.attributes) and self._evaluate_filter(
            b.filter, b.attributes, a.attributes
        )

    def _evaluate_filter(
        self,
        filter: dict[str, Any] | None,
        self_attrs: dict[str, Any],
        target_attrs: dict[str, Any],
    ) -> bool:
        if filter is None:
            return True
        for key, value in filter.items():
            resolved = self_attrs.get(key) if value == "@self" else value
            if key not in target_attrs:
                return False
            if target_attrs[key] != resolved:
                return False
        return True
