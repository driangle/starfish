package starfish

import (
	"encoding/json"
	"fmt"
)

// Target represents the "to" field which can be a single string or a list of strings.
type Target struct {
	Single   string
	Multiple []string
}

// IsZero returns true if the target is empty.
func (t Target) IsZero() bool {
	return t.Single == "" && len(t.Multiple) == 0
}

// Values returns all target IDs as a slice.
func (t Target) Values() []string {
	if len(t.Multiple) > 0 {
		return t.Multiple
	}
	if t.Single != "" {
		return []string{t.Single}
	}
	return nil
}

// MarshalJSON implements json.Marshaler. Emits a string for single targets
// and an array for multiple targets. Returns nil bytes for zero targets
// so the parent struct can omit the field.
func (t Target) MarshalJSON() ([]byte, error) {
	if len(t.Multiple) > 0 {
		return json.Marshal(t.Multiple)
	}
	if t.Single != "" {
		return json.Marshal(t.Single)
	}
	return []byte("null"), nil
}

// headerJSON is the JSON-compatible representation of Header used for
// custom marshaling to properly omit a zero-value Target.
type headerJSON struct {
	ID       string `json:"id"`
	Resource string `json:"resource"`
	Method   string `json:"method"`
	Kind     string `json:"kind"`

	V       int            `json:"v,omitempty"`
	Ts      *int64         `json:"ts,omitempty"`
	Session string         `json:"session,omitempty"`
	From    string         `json:"from,omitempty"`
	To      *Target        `json:"to,omitempty"`
	Topic   string         `json:"topic,omitempty"`
	ReplyTo string         `json:"replyTo,omitempty"`
	Meta    map[string]any `json:"meta,omitempty"`

	Delivery *DeliveryOptions `json:"delivery,omitempty"`
	Priority string           `json:"priority,omitempty"`
	TTL      *int64           `json:"ttl,omitempty"`
}

// MarshalJSON implements json.Marshaler to properly omit the "to" field when empty.
func (h Header) MarshalJSON() ([]byte, error) {
	j := headerJSON{
		ID: h.ID, Resource: h.Resource, Method: h.Method, Kind: h.Kind,
		V: h.V, Ts: h.Ts, Session: h.Session, From: h.From,
		Topic: h.Topic, ReplyTo: h.ReplyTo, Meta: h.Meta,
		Delivery: h.Delivery, Priority: h.Priority, TTL: h.TTL,
	}
	if !h.To.IsZero() {
		j.To = &h.To
	}
	return json.Marshal(j)
}

// UnmarshalJSON implements json.Unmarshaler.
func (h *Header) UnmarshalJSON(data []byte) error {
	var j headerJSON
	if err := json.Unmarshal(data, &j); err != nil {
		return err
	}
	h.ID = j.ID
	h.Resource = j.Resource
	h.Method = j.Method
	h.Kind = j.Kind
	h.V = j.V
	h.Ts = j.Ts
	h.Session = j.Session
	h.From = j.From
	h.Topic = j.Topic
	h.ReplyTo = j.ReplyTo
	h.Meta = j.Meta
	h.Delivery = j.Delivery
	h.Priority = j.Priority
	h.TTL = j.TTL
	if j.To != nil {
		h.To = *j.To
	}
	return nil
}

// UnmarshalJSON implements json.Unmarshaler. Accepts both a string and an array of strings.
func (t *Target) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}

	// Try string first.
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		t.Single = s
		t.Multiple = nil
		return nil
	}

	// Try array.
	var arr []string
	if err := json.Unmarshal(data, &arr); err == nil {
		t.Single = ""
		t.Multiple = arr
		return nil
	}

	return fmt.Errorf("starfish: \"to\" field must be a string or array of strings")
}

// SingleTarget creates a Target for a single recipient.
func SingleTarget(id string) Target {
	return Target{Single: id}
}

// MultiTarget creates a Target for multiple recipients.
func MultiTarget(ids ...string) Target {
	return Target{Multiple: ids}
}

// MarshalFrame serializes a Frame to JSON bytes.
func MarshalFrame(f *Frame) ([]byte, error) {
	return json.Marshal(f)
}

// UnmarshalFrame deserializes JSON bytes into a Frame.
func UnmarshalFrame(data []byte) (*Frame, error) {
	var f Frame
	if err := json.Unmarshal(data, &f); err != nil {
		return nil, fmt.Errorf("starfish: failed to unmarshal frame: %w", err)
	}
	return &f, nil
}
