// Package common holds the tiny bits of setup shared by every example so each
// example file can stay focused on the one SDK feature it demonstrates.
package common

import (
	"os"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

// DefaultServerURL is the address of a local Starfish server started with its
// default options (see servers/golang/README.md).
const DefaultServerURL = "ws://localhost:8080/starfish"

// ServerURL returns the server to connect to, honoring the STARFISH_SERVER_URL
// environment variable so examples can be pointed at a different server without
// code changes.
func ServerURL() string {
	if url := os.Getenv("STARFISH_SERVER_URL"); url != "" {
		return url
	}
	return DefaultServerURL
}

// NewClient builds a client identified by name, connected to ServerURL(). The
// connection example shows this construction inline; the other examples use
// this helper to keep the boilerplate out of the way.
func NewClient(name string) *starfish.Client {
	return starfish.NewClient(starfish.ClientOptions{
		Server: ServerURL(),
		Client: &starfish.ClientIdentity{Name: name, Role: "example"},
	})
}
