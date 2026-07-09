# Starfish Go Server

Go server implementation for the Starfish protocol.

## Prerequisites

- Go 1.26+

## Running

```bash
cd servers/golang

# Install dependencies
go mod download

# Build and run
go build -o starfish-server .
./starfish-server
```

The server listens on `ws://localhost:8080/starfish` by default.

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-addr` | `:8080` | Address to listen on |

```bash
# Run on a custom port
./starfish-server -addr ":9000"
```

### Run without building

```bash
go run . 
```
