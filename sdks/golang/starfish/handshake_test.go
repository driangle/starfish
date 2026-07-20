package starfish

import (
	"testing"
)

func TestNewHelloFrame(t *testing.T) {
	var gen IDGenerator
	opts := &ClientOptions{
		Server: "ws://localhost:8000",
		Client: &ClientIdentity{Name: "test-client", Role: "player"},
	}

	f := NewHelloFrame(&gen, opts)

	if f.Header.V != 1 {
		t.Errorf("V = %d, want 1", f.Header.V)
	}
	if f.Header.Resource != "client" {
		t.Errorf("Resource = %v, want client", f.Header.Resource)
	}
	if f.Header.Method != "hello" {
		t.Errorf("Method = %v, want hello", f.Header.Method)
	}
	if f.Header.Kind != "request" {
		t.Errorf("Kind = %v, want request", f.Header.Kind)
	}
	if f.Header.Ts == nil {
		t.Fatal("Ts should not be nil")
	}
	if f.Header.ID != "hello_1" {
		t.Errorf("ID = %v, want hello_1", f.Header.ID)
	}

	versions, ok := f.Payload["versions"].([]int)
	if !ok || len(versions) != 1 || versions[0] != 1 {
		t.Errorf("Payload.versions = %v, want [1]", f.Payload["versions"])
	}

	client := f.Payload["client"].(map[string]any)
	if client["name"] != "test-client" {
		t.Errorf("client.name = %v, want test-client", client["name"])
	}
	if client["role"] != "player" {
		t.Errorf("client.role = %v, want player", client["role"])
	}
}

func TestNewHelloFrame_Defaults(t *testing.T) {
	var gen IDGenerator
	opts := &ClientOptions{Server: "ws://localhost:8000"}

	f := NewHelloFrame(&gen, opts)

	client := f.Payload["client"].(map[string]any)
	if client["name"] != "starfish-client" {
		t.Errorf("default name = %v, want starfish-client", client["name"])
	}
	if client["role"] != "default" {
		t.Errorf("default role = %v, want default", client["role"])
	}

	auth := f.Payload["auth"].(map[string]any)
	if auth["type"] != "none" {
		t.Errorf("default auth.type = %v, want none", auth["type"])
	}
}

func TestNewResumeFrame(t *testing.T) {
	var gen IDGenerator
	f := NewResumeFrame(&gen, "rt_abc123")

	if f.Header.V != 1 {
		t.Errorf("V = %d, want 1", f.Header.V)
	}
	if f.Header.Resource != "client" {
		t.Errorf("Resource = %v, want client", f.Header.Resource)
	}
	if f.Header.Method != "hello" {
		t.Errorf("Method = %v, want hello", f.Header.Method)
	}

	if f.Payload["resumeToken"] != "rt_abc123" {
		t.Errorf("resumeToken = %v, want rt_abc123", f.Payload["resumeToken"])
	}
}

func TestParseWelcome_Success(t *testing.T) {
	f := &Frame{
		Header: Header{
			V:        1,
			ID:       "msg_1",
			Resource: "client",
			Method:   "welcome",
			Kind:     "response",
			ReplyTo:  "hello_1",
		},
		Payload: map[string]any{
			"status":            "ok",
			"version":           float64(1),
			"clientId":          "client_xyz",
			"resumeToken":       "rt_123",
			"resumeTimeout":     float64(30000),
			"serverTime":        float64(1700000000000),
			"heartbeatInterval": float64(15000),
			"sessionRequired":   true,
		},
	}

	w, sfErr := ParseWelcome(f)
	if sfErr != nil {
		t.Fatalf("unexpected error: %v", sfErr)
	}

	if w.Status != "ok" {
		t.Errorf("Status = %v, want ok", w.Status)
	}
	if w.Version != 1 {
		t.Errorf("Version = %d, want 1", w.Version)
	}
	if w.ClientID != "client_xyz" {
		t.Errorf("ClientID = %v, want client_xyz", w.ClientID)
	}
	if w.ResumeToken != "rt_123" {
		t.Errorf("ResumeToken = %v, want rt_123", w.ResumeToken)
	}
	if w.HeartbeatInterval != 15000 {
		t.Errorf("HeartbeatInterval = %d, want 15000", w.HeartbeatInterval)
	}
	if w.ServerTime != 1700000000000 {
		t.Errorf("ServerTime = %d, want 1700000000000", w.ServerTime)
	}
	if !w.SessionRequired {
		t.Error("SessionRequired should be true")
	}
}

func TestParseWelcome_Error(t *testing.T) {
	f := &Frame{
		Header: Header{
			ID:       "msg_1",
			Resource: "client",
			Method:   "welcome",
			Kind:     "response",
		},
		Payload: map[string]any{
			"status": "error",
			"error": map[string]any{
				"code":     "protocol.unsupported_version",
				"resource": "client",
				"message":  "Version not supported",
				"retry":    false,
			},
		},
	}

	w, sfErr := ParseWelcome(f)
	if w != nil {
		t.Error("expected nil welcome on error")
	}
	if sfErr == nil {
		t.Fatal("expected non-nil StarfishError")
	}
	if sfErr.Code != "protocol.unsupported_version" {
		t.Errorf("Code = %v, want protocol.unsupported_version", sfErr.Code)
	}
}

func TestParseWelcome_NilPayload(t *testing.T) {
	f := &Frame{
		Header: Header{ID: "msg_1", Resource: "client", Method: "welcome", Kind: "response"},
	}
	_, sfErr := ParseWelcome(f)
	if sfErr == nil {
		t.Error("expected error for nil payload")
	}
}
