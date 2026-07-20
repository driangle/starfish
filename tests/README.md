# Tests

Integration test suite that validates server implementations against the Starfish protocol specification.

## Structure

```
tests/
  integration/
    src/
      connection.test.ts    # Connection lifecycle
      sessions.test.ts      # Session join/leave
      presence.test.ts      # Presence tracking
      topics.test.ts        # Topic pub/sub
      messaging.test.ts     # Direct and broadcast messaging
      ack.test.ts           # Acknowledgements (ack/nack routing)
      data.test.ts          # Shared data operations
      broadcast.test.ts     # Broadcast messaging
      rtc-signaling.test.ts # WebRTC signaling
      errors.test.ts        # Error handling
      helpers/              # Shared test utilities
```

Tests are written in TypeScript using Vitest and connect directly over WebSocket to exercise protocol behavior.

## Running

The tests are run against each server implementation via Makefile targets:

```bash
make test-golang       # Test Go server
make test-typescript   # Test TypeScript server
make test-integration  # Test all servers (protocol + SDK)
```

Or use the scripts directly:

```bash
./scripts/run-integration-tests.sh golang
./scripts/run-integration-tests.sh typescript
```

Each script starts the target server, runs the test suite, and shuts the server down.
