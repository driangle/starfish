# Starfish Go SDK Examples

Small, self-contained programs demonstrating each feature of the Starfish Go
SDK (`github.com/driangle/starfish/sdks/golang`). Each example is a reference
you can copy from when building Go services, CLI tools, or servers on Starfish.

## Prerequisites

- Go 1.26+
- A running Starfish server at `ws://localhost:8080/starfish`
  (see [Go server instructions](../../servers/golang/README.md))

## Setup

This directory is its own Go module. It builds against the SDK in this repo via
a `replace` directive in `go.mod`, so there is nothing to publish or install --
just fetch dependencies:

```bash
cd examples/golang
go mod download
```

Point the examples at a different server with the `STARFISH_SERVER_URL`
environment variable:

```bash
STARFISH_SERVER_URL=ws://localhost:9000/starfish go run ./connection
```

## Examples

Each example is a `package main` in its own directory; run it with `go run`.

### Connection (`go run ./connection`)

Client setup, WebSocket handshake, session join/leave, connection-state
tracking, and observing peers as they join and leave.

**SDK features:** `NewClient`, `Connect`, `Join`, `Leave`, `Disconnect`,
`OnConnectionChange`, `State`, `ClientID`, `Peers`

### Pub/Sub (`go run ./pubsub`)

Two clients in the same session -- one publishes messages to a topic, the other
subscribes and receives them.

**SDK features:** `Subscribe`, `Publish`, `Unsubscribe`,
`On(EventFilter{Resource: "topic", Method: "message"})`

### Presence (`go run ./presence`)

Two clients set and update presence data, observing each other's changes in
real time.

**SDK features:** `SetPresence`, `OnPresence`, `PresenceAll`, `Presence`

### Shared Data (`go run ./shareddata`)

Collaborative state using replace, merge, and counter operations with version
tracking, plus optimistic concurrency via expected-version checks.

**SDK features:** `Save`, `Get`, `OnDataChanged`, `SaveOptions.ExpectedVersion`,
`OpReplace` / `OpMerge` / `OpCounterAdd`

### Clock Sync (`go run ./clocksync`)

Synchronized timing across clients using round-trip measurement, then scheduling
an action at a shared server time.

**SDK features:** `ClockSync`, `ClockNow`, `ClockOffset`

## How incoming messages are delivered

The Go SDK delivers server-pushed frames (topic messages, presence updates, data
changes, peer join/leave) through **callbacks**, not channels. Register a
handler with one of the `On*` methods; each returns an `Unsubscribe` function:

```go
unsub := client.On(starfish.EventFilter{Resource: "topic", Method: "message", Topic: "chat"},
    func(f *starfish.Frame) {
        // f.Header.From is the sender's client id; f.Payload is the body.
    })
defer unsub()
```

To wait for a message in a synchronous flow, bridge the callback to a channel
yourself (the SDK's integration tests use this pattern).

## More

- Go SDK: [`sdks/golang`](../../sdks/golang/README.md)
- Guide and API reference: [`docs/`](../../docs/guide/index.md)
- Examples in other languages: [`examples/`](../)
