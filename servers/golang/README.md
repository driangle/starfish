# Starfish Go Server

Go server implementation for the Starfish protocol.

## Installation

```bash
go install github.com/driangle/starfish/servers/golang@latest
```

Or to use the `starfish` package as a library in your own project:

```bash
go get github.com/driangle/starfish/servers/golang
```

## Usage as a Library

```go
package main

import (
	"log"
	"net/http"

	"github.com/driangle/starfish/servers/golang/starfish"
)

func main() {
	config := starfish.DefaultConfig()
	config.Addr = ":8080"

	hub := starfish.NewHub(config)
	hub.StartHeartbeatChecker()

	http.Handle("/starfish", hub)
	log.Fatal(http.ListenAndServe(config.Addr, nil))
}
```

## Running the Binary

### Prerequisites

- Go 1.26+

```bash
cd servers/golang

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

## License

MIT — see [LICENSE](LICENSE) for details.
