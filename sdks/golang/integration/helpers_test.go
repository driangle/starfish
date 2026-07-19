// Package integration holds end-to-end tests that exercise the Go SDK against a
// running Starfish server. They are guarded by STARFISH_SERVER_URL so that a
// plain `go test ./...` (with no server) skips them cleanly.
//
// Set STARFISH_SERVER_URL to enable (e.g., ws://localhost:4080/starfish).
package integration

import (
	"fmt"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

// serverURL returns the server to test against, skipping the test when unset.
func serverURL(t *testing.T) string {
	t.Helper()
	url := os.Getenv("STARFISH_SERVER_URL")
	if url == "" {
		t.Skip("STARFISH_SERVER_URL not set; skipping integration test")
	}
	return url
}

// newClient builds a test client with the standard test identity.
func newClient(url, name string) *starfish.Client {
	return starfish.NewClient(starfish.ClientOptions{
		Server: url,
		Client: &starfish.ClientIdentity{Name: name, Role: "test"},
	})
}

var sessionCounter int64

// uniqueSession returns a session name unlikely to collide across tests or runs
// against a long-lived server.
func uniqueSession(prefix string) string {
	n := atomic.AddInt64(&sessionCounter, 1)
	return fmt.Sprintf("go-sdk-%s-%d-%d", prefix, time.Now().UnixMilli(), n)
}
