package starfish

import (
	"testing"
	"time"
)

func TestPendingRequests_ResolveSuccess(t *testing.T) {
	p := newPendingRequests()
	ch := p.add("msg_1", 5*time.Second)

	reply := &Frame{Header: Header{ReplyTo: "msg_1"}, Payload: map[string]any{"status": "ok"}}
	resolved := p.resolve(reply)

	if !resolved {
		t.Fatal("expected resolve to return true")
	}

	select {
	case f := <-ch:
		if f.Payload["status"] != "ok" {
			t.Fatalf("unexpected payload: %v", f.Payload)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for resolve")
	}
}

func TestPendingRequests_Timeout(t *testing.T) {
	p := newPendingRequests()
	ch := p.add("msg_2", 50*time.Millisecond)

	select {
	case _, ok := <-ch:
		if ok {
			t.Fatal("expected channel to be closed on timeout")
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("timed out waiting for timeout")
	}
}

func TestPendingRequests_RejectAll(t *testing.T) {
	p := newPendingRequests()
	ch1 := p.add("msg_3", 5*time.Second)
	ch2 := p.add("msg_4", 5*time.Second)

	p.rejectAll()

	select {
	case _, ok := <-ch1:
		if ok {
			t.Fatal("expected ch1 to be closed")
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("ch1 not closed")
	}

	select {
	case _, ok := <-ch2:
		if ok {
			t.Fatal("expected ch2 to be closed")
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("ch2 not closed")
	}
}

func TestPendingRequests_NoMatchReturns_False(t *testing.T) {
	p := newPendingRequests()
	p.add("msg_5", 5*time.Second)

	reply := &Frame{Header: Header{ReplyTo: "msg_999"}}
	if p.resolve(reply) {
		t.Fatal("expected resolve to return false for unknown ID")
	}
}

func TestPendingRequests_EmptyReplyTo(t *testing.T) {
	p := newPendingRequests()
	reply := &Frame{Header: Header{}}
	if p.resolve(reply) {
		t.Fatal("expected resolve to return false for empty replyTo")
	}
}
