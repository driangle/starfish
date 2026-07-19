package starfish

import (
	"testing"
	"time"
)

func TestClockManager_SetInitialOffset(t *testing.T) {
	conn := newConnection(&IDGenerator{}, newEventBus())
	cm := newClockManager(conn, &IDGenerator{})

	serverTime := time.Now().UnixMilli() + 500 // server is 500ms ahead
	cm.setInitialOffset(serverTime)

	offset := cm.getOffset()
	// Offset should be approximately 500ms (within 50ms tolerance)
	if offset < 450 || offset > 550 {
		t.Fatalf("unexpected offset: %d (expected ~500)", offset)
	}
}

func TestClockManager_Now(t *testing.T) {
	conn := newConnection(&IDGenerator{}, newEventBus())
	cm := newClockManager(conn, &IDGenerator{})

	cm.mu.Lock()
	cm.offset = 1000
	cm.mu.Unlock()

	now := cm.now()
	localNow := time.Now().UnixMilli()

	// now() should be approximately localNow + 1000
	diff := now - localNow
	if diff < 990 || diff > 1010 {
		t.Fatalf("unexpected now diff: %d (expected ~1000)", diff)
	}
}
