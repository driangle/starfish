package starfish

import (
	"encoding/json"
	"fmt"
)

// StarfishError is a structured protocol error returned in response payloads.
type StarfishError struct {
	Code     string          `json:"code"`
	Resource string          `json:"resource,omitempty"`
	Message  string          `json:"message"`
	Retry    bool            `json:"retry"`
	Details  json.RawMessage `json:"details,omitempty"`
}

func (e *StarfishError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// RequestError wraps a StarfishError with the frame ID that triggered it.
type RequestError struct {
	RequestID string
	Err       *StarfishError
}

func (e *RequestError) Error() string {
	return fmt.Sprintf("request %s failed: %s", e.RequestID, e.Err.Error())
}

func (e *RequestError) Unwrap() error {
	return e.Err
}

// ParseErrorPayload extracts a StarfishError from a response payload, if present.
func ParseErrorPayload(payload map[string]any) *StarfishError {
	if payload == nil {
		return nil
	}

	status, _ := payload["status"].(string)
	if status != "error" {
		return nil
	}

	errObj, ok := payload["error"]
	if !ok {
		return nil
	}

	// Re-marshal and unmarshal to parse the error object.
	data, err := json.Marshal(errObj)
	if err != nil {
		return nil
	}

	var sfErr StarfishError
	if err := json.Unmarshal(data, &sfErr); err != nil {
		return nil
	}
	return &sfErr
}
