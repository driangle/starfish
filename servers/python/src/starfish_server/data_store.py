from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass
class DataEntry:
    data: Any
    version: int
    updated_by: str


class ConflictError(Exception):
    def __init__(self, actual_version: int, current_data: Any) -> None:
        super().__init__(f"version conflict: actual version is {actual_version}")
        self.actual_version = actual_version
        self.current_data = current_data


EMPTY_ENTRY = DataEntry(data=None, version=0, updated_by="")


class DataStore:
    def __init__(self) -> None:
        self._session: dict[str, DataEntry] = {}
        self._client: dict[str, dict[str, DataEntry]] = {}

    def apply(
        self,
        op: str,
        key: str,
        scope: str,
        client_id: str,
        data: Any,
        expected_version: int | None = None,
    ) -> DataEntry:
        store = self._store_for_scope(scope, client_id)
        existing = store.get(key, EMPTY_ENTRY)

        if expected_version is not None and existing.version != expected_version:
            raise ConflictError(existing.version, existing.data)

        if op == "delete":
            store.pop(key, None)
            return DataEntry(data=None, version=existing.version + 1, updated_by=client_id)

        new_data = _apply_op(op, existing.data, data)
        entry = DataEntry(data=new_data, version=existing.version + 1, updated_by=client_id)
        store[key] = entry
        return entry

    def get(self, key: str, scope: str, client_id: str) -> DataEntry:
        store = self._store_for_scope(scope, client_id)
        return store.get(key, EMPTY_ENTRY)

    def _store_for_scope(self, scope: str, client_id: str) -> dict[str, DataEntry]:
        if scope == "self":
            if client_id not in self._client:
                self._client[client_id] = {}
            return self._client[client_id]
        return self._session


def _apply_op(op: str, existing: Any, incoming: Any) -> Any:
    match op:
        case "replace":
            return incoming
        case "merge":
            return _merge_objects(existing, incoming)
        case "set.add":
            return _set_add(existing, incoming)
        case "set.remove":
            return _set_remove(existing, incoming)
        case "list.add":
            return _list_add(existing, incoming)
        case "list.remove":
            return _list_remove(existing, incoming)
        case "counter.add":
            return _counter_add(existing, incoming)
        case _:
            raise ValueError(f"invalid operation: {op}")


def _merge_objects(existing: Any, incoming: Any) -> Any:
    if not isinstance(incoming, dict):
        raise ValueError("merge requires an object")
    base: dict[str, Any] = {}
    if isinstance(existing, dict):
        base = {**existing}
    return {**base, **incoming}


def _set_add(existing: Any, incoming: Any) -> list[Any]:
    items: list[Any] = list(existing) if isinstance(existing, list) else []
    in_str = json.dumps(incoming, sort_keys=True)
    for item in items:
        if json.dumps(item, sort_keys=True) == in_str:
            return items
    items.append(incoming)
    return items


def _set_remove(existing: Any, incoming: Any) -> list[Any]:
    items: list[Any] = existing if isinstance(existing, list) else []
    in_str = json.dumps(incoming, sort_keys=True)
    return [item for item in items if json.dumps(item, sort_keys=True) != in_str]


def _list_add(existing: Any, incoming: Any) -> list[Any]:
    items: list[Any] = list(existing) if isinstance(existing, list) else []
    items.append(incoming)
    return items


def _list_remove(existing: Any, incoming: Any) -> list[Any]:
    items: list[Any] = existing if isinstance(existing, list) else []
    in_str = json.dumps(incoming, sort_keys=True)
    return [item for item in items if json.dumps(item, sort_keys=True) != in_str]


def _counter_add(existing: Any, incoming: Any) -> int | float:
    current = existing if isinstance(existing, (int, float)) else 0
    if not isinstance(incoming, (int, float)):
        raise ValueError("counter.add requires a number")
    return current + incoming
