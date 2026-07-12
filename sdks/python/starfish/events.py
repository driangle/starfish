from __future__ import annotations

from typing import Callable

from .emitter import EventStream, Unsubscribe
from .types import EventFilter, StarfishFrame


class Events:
    def __init__(self) -> None:
        self._stream: EventStream[StarfishFrame] = EventStream()

    def dispatch(self, frame: StarfishFrame) -> None:
        self._stream.emit(frame)

    def events(self, filter: EventFilter | None = None) -> EventStream[StarfishFrame]:
        if filter is None:
            return self._stream

        filtered: EventStream[StarfishFrame] = EventStream()

        def handler(frame: StarfishFrame) -> None:
            if filter.type and frame.type != filter.type:
                return
            if filter.topic and frame.topic != filter.topic:
                return
            if filter.from_ and frame.from_ != filter.from_:
                return
            filtered.emit(frame)

        self._stream.subscribe(handler)
        return filtered

    def subscribe(self, callback: Callable[[StarfishFrame], None]) -> Unsubscribe:
        return self._stream.subscribe(callback)
