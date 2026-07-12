from unittest.mock import MagicMock

from starfish.emitter import EventStream, Observable


class TestObservable:
    def test_holds_initial_value(self):
        obs = Observable(42)
        assert obs.value == 42

    def test_notifies_subscribers_on_set(self):
        obs = Observable(0)
        callback = MagicMock()
        obs.subscribe(callback)

        obs.set(1)
        callback.assert_called_with(1)

        obs.set(2)
        callback.assert_called_with(2)
        assert callback.call_count == 2

    def test_updates_current_value_on_set(self):
        obs = Observable("a")
        obs.set("b")
        assert obs.value == "b"

    def test_supports_unsubscribe(self):
        obs = Observable(0)
        callback = MagicMock()
        unsub = obs.subscribe(callback)

        obs.set(1)
        assert callback.call_count == 1

        unsub()
        obs.set(2)
        assert callback.call_count == 1

    def test_supports_multiple_subscribers(self):
        obs = Observable(0)
        cb1 = MagicMock()
        cb2 = MagicMock()
        obs.subscribe(cb1)
        obs.subscribe(cb2)

        obs.set(5)
        cb1.assert_called_with(5)
        cb2.assert_called_with(5)


class TestEventStream:
    def test_emits_values_to_subscribers(self):
        stream: EventStream[str] = EventStream()
        callback = MagicMock()
        stream.subscribe(callback)

        stream.emit("hello")
        callback.assert_called_with("hello")

    def test_supports_unsubscribe(self):
        stream: EventStream[int] = EventStream()
        callback = MagicMock()
        unsub = stream.subscribe(callback)

        stream.emit(1)
        unsub()
        stream.emit(2)

        assert callback.call_count == 1
        callback.assert_called_with(1)

    def test_handles_multiple_subscribers(self):
        stream: EventStream[int] = EventStream()
        cb1 = MagicMock()
        cb2 = MagicMock()
        stream.subscribe(cb1)
        stream.subscribe(cb2)

        stream.emit(42)
        cb1.assert_called_with(42)
        cb2.assert_called_with(42)
