// Shared Data Example
// -------------------
// Demonstrates: collaborative state with replace / merge / counter operations,
// reading values back, watching changes, and optimistic concurrency via
// expected-version checks.
//
// Two clients share a "config" object and a "score" counter.
//
// Run:      go run ./shareddata
// Requires: a Starfish server at ws://localhost:8080/starfish (STARFISH_SERVER_URL to override).
package main

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/driangle/starfish/examples/golang/internal/common"
	"github.com/driangle/starfish/sdks/golang/starfish"
)

const session = "shared-data-demo"

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	a := common.NewClient("Client-A")
	b := common.NewClient("Client-B")

	mustConnectAndJoin(ctx, a, session)
	mustConnectAndJoin(ctx, b, session)
	defer a.Disconnect()
	defer b.Disconnect()
	log.Println("both clients joined the session")

	// Client-B watches every data change in the session. Change notifications
	// carry the key, new value, version, and who made the change.
	b.OnDataChanged(func(f *starfish.Frame) {
		log.Printf("[Client-B saw change] %v = %v (v%v)",
			f.Payload["key"], f.Payload["data"], f.Payload["version"])
	})
	time.Sleep(200 * time.Millisecond)

	// --- replace: set a whole value ---
	log.Println("Client-A replaces 'config' with {theme: dark, fontSize: 14}")
	r := save(ctx, a, &starfish.SaveOptions{
		Key: "config", Scope: starfish.ScopeSession, Op: starfish.OpReplace,
		Data: map[string]any{"theme": "dark", "fontSize": 14},
	})
	log.Printf("  saved at version %d", r.Version)
	time.Sleep(300 * time.Millisecond)

	// --- merge: partial update, keeping other fields ---
	log.Println("Client-B merges {fontSize: 18} into 'config'")
	save(ctx, b, &starfish.SaveOptions{
		Key: "config", Scope: starfish.ScopeSession, Op: starfish.OpMerge,
		Data: map[string]any{"fontSize": 18},
	})
	time.Sleep(300 * time.Millisecond)

	// --- get: read the current value ---
	cfg := get(ctx, a, "config")
	log.Printf("Client-A reads 'config': %v (v%d)", cfg.Data, cfg.Version)

	// --- counter: concurrent increments converge without lost updates ---
	log.Println("initializing 'score' to 0, then A += 10 and B += 5")
	save(ctx, a, &starfish.SaveOptions{Key: "score", Scope: starfish.ScopeSession, Op: starfish.OpReplace, Data: 0})
	time.Sleep(200 * time.Millisecond)
	save(ctx, a, &starfish.SaveOptions{Key: "score", Scope: starfish.ScopeSession, Op: starfish.OpCounterAdd, Data: 10})
	save(ctx, b, &starfish.SaveOptions{Key: "score", Scope: starfish.ScopeSession, Op: starfish.OpCounterAdd, Data: 5})
	time.Sleep(300 * time.Millisecond)
	score := get(ctx, a, "score")
	log.Printf("final 'score': %v (v%d)", score.Data, score.Version)

	// --- optimistic concurrency: guard a write with the version we read ---
	// Both clients read the same version, then both try to replace using that
	// ExpectedVersion. The first write wins; the second is rejected because the
	// stored version no longer matches -- no silent lost update.
	current := get(ctx, a, "config")
	expected := current.Version
	log.Printf("both clients try a conditional write expecting v%d", expected)

	firstErr := saveErr(ctx, a, &starfish.SaveOptions{
		Key: "config", Scope: starfish.ScopeSession, Op: starfish.OpMerge,
		Data: map[string]any{"theme": "light"}, ExpectedVersion: &expected,
	})
	secondErr := saveErr(ctx, b, &starfish.SaveOptions{
		Key: "config", Scope: starfish.ScopeSession, Op: starfish.OpMerge,
		Data: map[string]any{"theme": "solarized"}, ExpectedVersion: &expected,
	})
	report("Client-A conditional write", firstErr)
	report("Client-B conditional write", secondErr)

	log.Println("done.")
}

func save(ctx context.Context, c *starfish.Client, opts *starfish.SaveOptions) *starfish.DataResult {
	r, err := c.Save(ctx, opts)
	if err != nil {
		log.Fatalf("save %q failed: %v", opts.Key, err)
	}
	return r
}

// saveErr performs a save but returns the error instead of exiting, so the
// caller can show how a version conflict surfaces.
func saveErr(ctx context.Context, c *starfish.Client, opts *starfish.SaveOptions) error {
	_, err := c.Save(ctx, opts)
	return err
}

func get(ctx context.Context, c *starfish.Client, key string) *starfish.DataResult {
	r, err := c.Get(ctx, &starfish.GetOptions{Key: key, Scope: starfish.ScopeSession})
	if err != nil {
		log.Fatalf("get %q failed: %v", key, err)
	}
	return r
}

// report explains the outcome of a conditional write, unwrapping the structured
// StarfishError to show the server's error code when the version check fails.
func report(label string, err error) {
	if err == nil {
		log.Printf("  %s: succeeded", label)
		return
	}
	var sfErr *starfish.StarfishError
	if errors.As(err, &sfErr) {
		log.Printf("  %s: rejected (code=%s: %s)", label, sfErr.Code, sfErr.Message)
		return
	}
	log.Printf("  %s: failed: %v", label, err)
}

func mustConnectAndJoin(ctx context.Context, c *starfish.Client, session string) {
	if err := c.Connect(ctx); err != nil {
		log.Fatalf("connect failed: %v", err)
	}
	if _, err := c.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		log.Fatalf("join failed: %v", err)
	}
}
