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
            if let resource = filter.resource, frame.header.resource != resource { return }
            if let method = filter.method, frame.header.method != method { return }
            if let topic = filter.topic, frame.header.topic != topic { return }
            if let from = filter.from, frame.header.from != from { return }
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
