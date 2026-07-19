package starfish

import (
	"sync/atomic"
	"testing"
)

func TestEventBus_DispatchAll(t *testing.T) {
	bus := newEventBus()
	var count atomic.Int32

	bus.on(EventFilter{}, func(f *Frame) {
		count.Add(1)
	})

	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "message"}})
	bus.dispatch(&Frame{Header: Header{Resource: "client", Method: "message"}})

	if count.Load() != 2 {
		t.Fatalf("expected 2 dispatches, got %d", count.Load())
	}
}

func TestEventBus_FilterByResource(t *testing.T) {
	bus := newEventBus()
	var count atomic.Int32

	bus.on(EventFilter{Resource: "topic"}, func(f *Frame) {
		count.Add(1)
	})

	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "message"}})
	bus.dispatch(&Frame{Header: Header{Resource: "client", Method: "message"}})

	if count.Load() != 1 {
		t.Fatalf("expected 1 dispatch, got %d", count.Load())
	}
}

func TestEventBus_FilterByMethod(t *testing.T) {
	bus := newEventBus()
	var count atomic.Int32

	bus.on(EventFilter{Resource: "topic", Method: "message"}, func(f *Frame) {
		count.Add(1)
	})

	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "message"}})
	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "subscribed"}})

	if count.Load() != 1 {
		t.Fatalf("expected 1 dispatch, got %d", count.Load())
	}
}

func TestEventBus_FilterByTopic(t *testing.T) {
	bus := newEventBus()
	var received []*Frame

	bus.on(EventFilter{Topic: "lights"}, func(f *Frame) {
		received = append(received, f)
	})

	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "message", Topic: "lights"}})
	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "message", Topic: "audio"}})

	if len(received) != 1 {
		t.Fatalf("expected 1 received, got %d", len(received))
	}
	if received[0].Header.Topic != "lights" {
		t.Fatalf("unexpected topic: %s", received[0].Header.Topic)
	}
}

func TestEventBus_Unsubscribe(t *testing.T) {
	bus := newEventBus()
	var count atomic.Int32

	unsub := bus.on(EventFilter{}, func(f *Frame) {
		count.Add(1)
	})

	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "message"}})
	unsub()
	bus.dispatch(&Frame{Header: Header{Resource: "topic", Method: "message"}})

	if count.Load() != 1 {
		t.Fatalf("expected 1 dispatch after unsub, got %d", count.Load())
	}
}

func TestEventBus_FilterByFrom(t *testing.T) {
	bus := newEventBus()
	var count atomic.Int32

	bus.on(EventFilter{From: "peer_1"}, func(f *Frame) {
		count.Add(1)
	})

	bus.dispatch(&Frame{Header: Header{Resource: "client", Method: "message", From: "peer_1"}})
	bus.dispatch(&Frame{Header: Header{Resource: "client", Method: "message", From: "peer_2"}})

	if count.Load() != 1 {
		t.Fatalf("expected 1 dispatch, got %d", count.Load())
	}
}
