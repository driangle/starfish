import Foundation

/// Global event dispatching with optional filtering.
final class Events: @unchecked Sendable {
    private let stream = EventStream<StarfishFrame>()

    func dispatch(_ frame: StarfishFrame) {
        stream.emit(frame)
    }

    /// Returns an EventStream filtered by the given criteria.
    func events$(filter: EventFilter? = nil) -> EventStream<StarfishFrame> {
        guard let filter = filter else { return stream }

        let filtered = EventStream<StarfishFrame>()
        stream.subscribe { frame in
            if let type = filter.type, frame.type != type { return }
            if let topic = filter.topic, frame.topic != topic { return }
            if let from = filter.from, frame.from != from { return }
            filtered.emit(frame)
        }
        return filtered
    }

    /// Subscribe to all events with a callback.
    @discardableResult
    func subscribe(_ callback: @escaping @Sendable (StarfishFrame) -> Void) -> Unsubscribe {
        stream.subscribe(callback)
    }
}
