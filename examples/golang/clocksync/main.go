// Clock Sync Example
// ------------------
// Demonstrates: synchronized timing across clients.
//
// Two clients sync their clocks to the server, compare their idea of "now"
// (which should agree despite network latency), and then both schedule an
// action at the same server time so it fires at nearly the same instant.
//
// The SDK exposes ClockSync / ClockNow / ClockOffset. It does not schedule
// callbacks for you, so we compute the delay from the synced clock and use the
// standard library's time.AfterFunc -- that is all a "run at server time T"
// helper needs to be.
//
// Run:      go run ./clocksync
// Requires: a Starfish server at ws://localhost:8080/starfish (STARFISH_SERVER_URL to override).
package main

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/driangle/starfish/examples/golang/internal/common"
	"github.com/driangle/starfish/sdks/golang/starfish"
)

const session = "clock-demo"

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	a := common.NewClient("Client-A")
	b := common.NewClient("Client-B")

	mustConnectAndJoin(ctx, a, session)
	mustConnectAndJoin(ctx, b, session)
	defer a.Disconnect()
	defer b.Disconnect()
	log.Println("both clients connected")

	// Before an explicit sync, ClockNow already returns a coarse estimate seeded
	// from the welcome frame at connect time.
	log.Printf("before sync: A local=%d synced=%d offset=%dms",
		time.Now().UnixMilli(), a.ClockNow(), a.ClockOffset())

	// Sync takes several round-trip samples and keeps the median offset.
	log.Println("syncing clocks...")
	if err := a.ClockSync(ctx); err != nil {
		log.Fatalf("A clock sync failed: %v", err)
	}
	if err := b.ClockSync(ctx); err != nil {
		log.Fatalf("B clock sync failed: %v", err)
	}
	log.Printf("  A offset=%dms  B offset=%dms", a.ClockOffset(), b.ClockOffset())

	// After sync the two clients should agree on "now" within a few ms.
	log.Printf("after sync: A now=%d  B now=%d  diff=%dms",
		a.ClockNow(), b.ClockNow(), abs(a.ClockNow()-b.ClockNow()))

	// Both clients target the SAME server time, one second out. Because their
	// clocks are synced, the two callbacks fire at nearly the same wall-clock
	// instant even though each computes its own local delay.
	target := a.ClockNow() + 1000
	log.Printf("scheduling an action at server time %d (~1s from now)...", target)

	var wg sync.WaitGroup
	wg.Add(2)
	scheduleAt(a, target, "Client-A", &wg)
	scheduleAt(b, target, "Client-B", &wg)
	wg.Wait()

	log.Println("done.")
}

// scheduleAt fires a callback when the client's synced clock reaches targetMs.
func scheduleAt(c *starfish.Client, targetMs int64, label string, wg *sync.WaitGroup) {
	delay := time.Duration(targetMs-c.ClockNow()) * time.Millisecond
	if delay < 0 {
		delay = 0
	}
	time.AfterFunc(delay, func() {
		log.Printf("  %s fired at local time %d", label, time.Now().UnixMilli())
		wg.Done()
	})
}

func abs(n int64) int64 {
	if n < 0 {
		return -n
	}
	return n
}

func mustConnectAndJoin(ctx context.Context, c *starfish.Client, session string) {
	if err := c.Connect(ctx); err != nil {
		log.Fatalf("connect failed: %v", err)
	}
	if _, err := c.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		log.Fatalf("join failed: %v", err)
	}
}
