from __future__ import annotations

import asyncio
import inspect
from typing import Callable, Generic, TypeVar

T = TypeVar("T")
Unsubscribe = Callable[[], None]


class Observable(Generic[T]):
    def __init__(self, initial: T) -> None:
        self._value = initial
        self._listeners: set[Callable] = set()

    @property
    def value(self) -> T:
        return self._value

    def set(self, value: T) -> None:
        self._value = value
        for listener in list(self._listeners):
            if inspect.iscoroutinefunction(listener):
                asyncio.ensure_future(listener(value))
            else:
                listener(value)

    def subscribe(self, callback: Callable) -> Unsubscribe:
        self._listeners.add(callback)

        def unsubscribe() -> None:
            self._listeners.discard(callback)

        return unsubscribe


class EventStream(Generic[T]):
    def __init__(self) -> None:
        self._listeners: set[Callable] = set()

    def emit(self, value: T) -> None:
        for listener in list(self._listeners):
            if inspect.iscoroutinefunction(listener):
                asyncio.ensure_future(listener(value))
            else:
                listener(value)

    def subscribe(self, callback: Callable) -> Unsubscribe:
        self._listeners.add(callback)

        def unsubscribe() -> None:
            self._listeners.discard(callback)

        return unsubscribe
