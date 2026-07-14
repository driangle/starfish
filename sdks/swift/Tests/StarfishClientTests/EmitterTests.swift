import XCTest
@testable import StarfishClient

final class EmitterTests: XCTestCase {

    func testObservableInitialValue() {
        let obs = Observable<Int>(42)
        XCTAssertEqual(obs.value, 42)
    }

    func testObservableSetUpdatesValue() {
        let obs = Observable<String>("hello")
        obs.set("world")
        XCTAssertEqual(obs.value, "world")
    }

    func testObservableStreamReceivesUpdates() async {
        let obs = Observable<Int>(0)

        let task = Task {
            var received: [Int] = []
            for await value in obs.stream {
                received.append(value)
                if received.count == 3 { break }
            }
            return received
        }

        try? await Task.sleep(nanoseconds: 50_000_000)
        obs.set(1)
        obs.set(2)
        obs.set(3)

        let result = await task.value
        XCTAssertEqual(result, [1, 2, 3])
    }

    func testObservableMultipleSubscribers() async {
        let obs = Observable<Int>(0)
        let received1 = Collected<Int>()
        let received2 = Collected<Int>()

        let unsub1 = obs.subscribe { received1.append($0) }
        let unsub2 = obs.subscribe { received2.append($0) }

        obs.set(1)
        obs.set(2)

        try? await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(received1.values, [1, 2])
        XCTAssertEqual(received2.values, [1, 2])

        unsub1()
        unsub2()
    }

    func testEventStreamEmit() async {
        let stream = EventStream<String>()
        let received = Collected<String>()

        let unsub = stream.subscribe { received.append($0) }

        stream.emit("a")
        stream.emit("b")

        try? await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(received.values, ["a", "b"])
        unsub()
    }

    func testEventStreamAsyncStream() async {
        let stream = EventStream<Int>()

        let task = Task {
            var received: [Int] = []
            for await value in stream.stream {
                received.append(value)
                if received.count == 2 { break }
            }
            return received
        }

        try? await Task.sleep(nanoseconds: 50_000_000)
        stream.emit(10)
        stream.emit(20)

        let result = await task.value
        XCTAssertEqual(result, [10, 20])
    }

    func testUnsubscribeStopsDelivery() async {
        let obs = Observable<Int>(0)
        let received = Collected<Int>()

        let unsub = obs.subscribe { received.append($0) }

        obs.set(1)
        try? await Task.sleep(nanoseconds: 50_000_000)

        unsub()

        obs.set(2)
        try? await Task.sleep(nanoseconds: 50_000_000)

        XCTAssertEqual(received.values, [1])
    }
}
