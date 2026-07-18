package starfish

import (
	"encoding/json"
	"testing"
)

func TestMarshalFrame_HeaderPayload(t *testing.T) {
	ts := int64(1700000000000)
	f := &Frame{
		Header: Header{
			V:        2,
			ID:       "msg_1",
			Resource: "session",
			Method:   "join",
			Kind:     "request",
			Ts:       &ts,
			Session:  "room-1",
		},
		Payload: map[string]any{
			"name": "alice",
		},
	}

	data, err := MarshalFrame(f)
	if err != nil {
		t.Fatalf("MarshalFrame: %v", err)
	}

	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("Unmarshal raw: %v", err)
	}

	// Must have top-level header and payload keys.
	if _, ok := raw["header"]; !ok {
		t.Fatal("missing top-level 'header' key")
	}
	if _, ok := raw["payload"]; !ok {
		t.Fatal("missing top-level 'payload' key")
	}

	header := raw["header"].(map[string]any)
	if header["id"] != "msg_1" {
		t.Errorf("header.id = %v, want msg_1", header["id"])
	}
	if header["resource"] != "session" {
		t.Errorf("header.resource = %v, want session", header["resource"])
	}
	if header["method"] != "join" {
		t.Errorf("header.method = %v, want join", header["method"])
	}
	if header["kind"] != "request" {
		t.Errorf("header.kind = %v, want request", header["kind"])
	}
	if header["session"] != "room-1" {
		t.Errorf("header.session = %v, want room-1", header["session"])
	}
}

func TestMarshalFrame_OmitsEmptyFields(t *testing.T) {
	f := &Frame{
		Header: Header{
			ID:       "msg_1",
			Resource: "topic",
			Method:   "publish",
			Kind:     "request",
		},
	}

	data, err := MarshalFrame(f)
	if err != nil {
		t.Fatalf("MarshalFrame: %v", err)
	}

	var raw map[string]any
	json.Unmarshal(data, &raw)

	header := raw["header"].(map[string]any)

	// These should be omitted.
	for _, key := range []string{"ts", "session", "from", "to", "topic", "replyTo", "delivery", "priority", "ttl", "meta"} {
		if _, ok := header[key]; ok {
			t.Errorf("expected header.%s to be omitted", key)
		}
	}

	// Payload should be omitted.
	if _, ok := raw["payload"]; ok {
		t.Error("expected payload to be omitted when nil")
	}
}

func TestRoundTrip(t *testing.T) {
	ts := int64(1700000000000)
	ttl := int64(5000)
	fallback := true
	original := &Frame{
		Header: Header{
			V:        2,
			ID:       "msg_42",
			Resource: "message",
			Method:   "send",
			Kind:     "request",
			Ts:       &ts,
			Session:  "game-1",
			To:       SingleTarget("peer-1"),
			ReplyTo:  "msg_40",
			Priority: "high",
			TTL:      &ttl,
			Meta:     map[string]any{"custom": "value"},
			Delivery: &DeliveryOptions{
				Reliability: "reliable",
				Ordering:    "ordered",
				Fallback:    &fallback,
			},
		},
		Payload: map[string]any{
			"action": "move",
			"x":      float64(10),
		},
	}

	data, err := MarshalFrame(original)
	if err != nil {
		t.Fatalf("MarshalFrame: %v", err)
	}

	got, err := UnmarshalFrame(data)
	if err != nil {
		t.Fatalf("UnmarshalFrame: %v", err)
	}

	if got.Header.ID != original.Header.ID {
		t.Errorf("ID = %v, want %v", got.Header.ID, original.Header.ID)
	}
	if got.Header.Resource != "message" {
		t.Errorf("Resource = %v, want message", got.Header.Resource)
	}
	if got.Header.Method != "send" {
		t.Errorf("Method = %v, want send", got.Header.Method)
	}
	if got.Header.Kind != "request" {
		t.Errorf("Kind = %v, want request", got.Header.Kind)
	}
	if got.Header.Priority != "high" {
		t.Errorf("Priority = %v, want high", got.Header.Priority)
	}
	if got.Header.ReplyTo != "msg_40" {
		t.Errorf("ReplyTo = %v, want msg_40", got.Header.ReplyTo)
	}
	if got.Header.To.Single != "peer-1" {
		t.Errorf("To.Single = %v, want peer-1", got.Header.To.Single)
	}
	if got.Header.Meta["custom"] != "value" {
		t.Errorf("Meta[custom] = %v, want value", got.Header.Meta["custom"])
	}
	if got.Header.Delivery == nil {
		t.Fatal("Delivery is nil")
	}
	if got.Header.Delivery.Reliability != "reliable" {
		t.Errorf("Delivery.Reliability = %v, want reliable", got.Header.Delivery.Reliability)
	}
	if got.Header.Delivery.Fallback == nil || *got.Header.Delivery.Fallback != true {
		t.Error("Delivery.Fallback should be true")
	}
	if got.Payload["action"] != "move" {
		t.Errorf("Payload[action] = %v, want move", got.Payload["action"])
	}
}

func TestTarget_SingleString(t *testing.T) {
	target := SingleTarget("client-1")
	data, err := json.Marshal(target)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	if string(data) != `"client-1"` {
		t.Errorf("got %s, want %q", data, "client-1")
	}

	var got Target
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if got.Single != "client-1" {
		t.Errorf("Single = %v, want client-1", got.Single)
	}
}

func TestTarget_MultipleStrings(t *testing.T) {
	target := MultiTarget("a", "b", "c")
	data, err := json.Marshal(target)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	var got Target
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	vals := got.Values()
	if len(vals) != 3 || vals[0] != "a" || vals[1] != "b" || vals[2] != "c" {
		t.Errorf("Values() = %v, want [a b c]", vals)
	}
}

func TestTarget_Null(t *testing.T) {
	var got Target
	if err := json.Unmarshal([]byte("null"), &got); err != nil {
		t.Fatalf("Unmarshal null: %v", err)
	}
	if !got.IsZero() {
		t.Error("expected IsZero() after unmarshaling null")
	}
}

func TestTarget_IsZero(t *testing.T) {
	var empty Target
	if !empty.IsZero() {
		t.Error("zero Target should be zero")
	}
	if SingleTarget("x").IsZero() {
		t.Error("SingleTarget should not be zero")
	}
}

func TestUnmarshalFrame_InvalidJSON(t *testing.T) {
	_, err := UnmarshalFrame([]byte("not json"))
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestUnmarshalFrame_WireFormat(t *testing.T) {
	// Simulate a frame as it would arrive on the wire.
	wire := `{
		"header": {
			"v": 2,
			"id": "msg_1",
			"resource": "topic",
			"method": "publish",
			"kind": "event",
			"ts": 1700000000000,
			"session": "room-1",
			"from": "peer-1",
			"to": ["a", "b"],
			"topic": "updates",
			"replyTo": "msg_0",
			"delivery": {
				"reliability": "unreliable",
				"preferTransport": "rtc",
				"includeSelf": true
			},
			"priority": "critical",
			"ttl": 3000,
			"meta": {"key": "val"}
		},
		"payload": {"score": 100}
	}`

	f, err := UnmarshalFrame([]byte(wire))
	if err != nil {
		t.Fatalf("UnmarshalFrame: %v", err)
	}

	h := f.Header
	if h.V != 2 {
		t.Errorf("V = %d, want 2", h.V)
	}
	if h.From != "peer-1" {
		t.Errorf("From = %v, want peer-1", h.From)
	}
	if h.Topic != "updates" {
		t.Errorf("Topic = %v, want updates", h.Topic)
	}
	vals := h.To.Values()
	if len(vals) != 2 || vals[0] != "a" {
		t.Errorf("To.Values() = %v, want [a b]", vals)
	}
	if h.Delivery.PreferTransport != "rtc" {
		t.Errorf("Delivery.PreferTransport = %v, want rtc", h.Delivery.PreferTransport)
	}
	if h.Delivery.IncludeSelf == nil || !*h.Delivery.IncludeSelf {
		t.Error("Delivery.IncludeSelf should be true")
	}
	if *h.TTL != 3000 {
		t.Errorf("TTL = %d, want 3000", *h.TTL)
	}
	if h.Meta["key"] != "val" {
		t.Errorf("Meta[key] = %v, want val", h.Meta["key"])
	}
	if f.Payload["score"] != float64(100) {
		t.Errorf("Payload[score] = %v, want 100", f.Payload["score"])
	}
}
