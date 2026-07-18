# Starfish Go Server

Go WebSocket server implementation for the Starfish protocol.

## Verification

Before considering any changes complete, run the following checks from this directory (`servers/golang/`):

```bash
# Vet (static analysis, must pass with no errors)
go vet ./...

# Format check (should produce no output — if it does, formatting is needed)
gofmt -l .

# Unit tests
go test ./...
```

All commands must exit with code 0. Do not skip any of them.

If formatting check shows files, run `gofmt -w .` and include the formatting fixes in your changes.
