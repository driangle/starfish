package starfish

import (
	"errors"
	"testing"
)

func TestStarfishError_Error(t *testing.T) {
	e := &StarfishError{
		Code:    "session.not_found",
		Message: "Session does not exist",
		Retry:   false,
	}
	got := e.Error()
	want := "session.not_found: Session does not exist"
	if got != want {
		t.Errorf("Error() = %q, want %q", got, want)
	}
}

func TestRequestError_Unwrap(t *testing.T) {
	sfErr := &StarfishError{Code: "test.err", Message: "fail"}
	reqErr := &RequestError{RequestID: "msg_1", Err: sfErr}

	var target *StarfishError
	if !errors.As(reqErr, &target) {
		t.Error("expected errors.As to match StarfishError")
	}
	if target.Code != "test.err" {
		t.Errorf("Code = %v, want test.err", target.Code)
	}
}

func TestParseErrorPayload_Error(t *testing.T) {
	payload := map[string]any{
		"status": "error",
		"error": map[string]any{
			"code":     "protocol.unsupported_version",
			"resource": "client",
			"message":  "Version not supported",
			"retry":    false,
		},
	}

	sfErr := ParseErrorPayload(payload)
	if sfErr == nil {
		t.Fatal("expected non-nil error")
	}
	if sfErr.Code != "protocol.unsupported_version" {
		t.Errorf("Code = %v, want protocol.unsupported_version", sfErr.Code)
	}
	if sfErr.Resource != "client" {
		t.Errorf("Resource = %v, want client", sfErr.Resource)
	}
	if sfErr.Retry {
		t.Error("Retry should be false")
	}
}

func TestParseErrorPayload_OK(t *testing.T) {
	payload := map[string]any{
		"status":   "ok",
		"clientId": "abc",
	}
	if ParseErrorPayload(payload) != nil {
		t.Error("expected nil for ok status")
	}
}

func TestParseErrorPayload_Nil(t *testing.T) {
	if ParseErrorPayload(nil) != nil {
		t.Error("expected nil for nil payload")
	}
}

func TestStarfishError_WithRetry(t *testing.T) {
	e := &StarfishError{
		Code:    "rate.limited",
		Message: "Too many requests",
		Retry:   true,
	}
	if !e.Retry {
		t.Error("Retry should be true")
	}
}
