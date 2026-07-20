---
title: "Fix Python SDK disconnect() breaking resume/reconnection"
id: "01ky0jyep"
status: pending
priority: high
type: bug
tags: ["sdk", "bug", "python"]
created_at: "2026-07-20"
---

# Fix Python SDK disconnect() breaking resume/reconnection

## Steps to Reproduce

1. Connect a Python SDK client and capture its `client_id` / resume token.
2. Call `client.disconnect()`.
3. Call `client.connect()` again (the SDK re-sends the stored resume token).
4. Observe that the server assigns a **new** `client_id` — the session was not resumed.

Reproduced deterministically (not timing-related): resume fails with reconnect
delays of 0ms, 10ms, 50ms, 100ms, and 200ms. The equivalent TypeScript SDK flow
resumes correctly, and a raw WebSocket replay of the Python SDK's exact resume
payload also resumes correctly — so the payload is fine; the fault is in the SDK's
disconnect sequence.

## Expected Behavior

After `disconnect()` then `connect()`, the server restores the same `client_id`
and session membership (`welcome.payload.resumed == true`), matching the
TypeScript SDK.

## Actual Behavior

Resume fails and a fresh session is created. Root cause: in
`sdks/python/starfish/connection.py`, `Connection.disconnect()` cancels the
receive task **before** closing the WebSocket:

```python
self._receive_task.cancel()
await self._receive_task
...
await self._close_ws()   # too late — clean close handshake never completes
```

Cancelling the task that owns the `async for message in self._ws` iteration
prevents the WebSocket closing handshake from completing promptly. The server
detects the drop late (after the reconnect `hello` has already been processed),
so `ResumeRegistry.Store` runs too late for `Restore` to find the token.

## Proposed Fix

Close the WebSocket **before** cancelling/awaiting the receive task so the close
handshake completes cleanly (verified fix, 3/3 resume trials succeed):

```python
async def disconnect(self) -> None:
    self._intentional_close = True
    self._cancel_reconnect()
    self._pending.reject_all(Exception("Client disconnected"))
    await self._close_ws()            # close first for a clean handshake
    if self._receive_task:
        self._receive_task.cancel()
        try:
            await self._receive_task
        except asyncio.CancelledError:
            pass
        self._receive_task = None
    self.state.set(ConnectionState.DISCONNECTED)
```

## Acceptance Criteria

- `client.disconnect()` + `client.connect()` preserves `client_id` against both
  the Go and TypeScript servers.
- Remove the `@pytest.mark.xfail` markers on the two resume tests in
  `sdks/python/integration/test_resume.py`
  (`test_resume_preserves_client_id`,
  `test_session_membership_restored_after_resume`) and confirm they pass.

## References

- Introduced/exposed by task `01kxjcjp6` (add resume/reconnection SDK integration tests).
- Bug is Python-only; the TypeScript SDK's `Connection.disconnect()` closes the
  socket cleanly and resumes correctly.
