package starfish

import "encoding/json"

// Frame is the canonical Starfish v0.2 message envelope.
type Frame struct {
	Header  Header         `json:"header"`
	Payload map[string]any `json:"payload,omitempty"`
}

// Header contains routing and protocol metadata for a frame.
type Header struct {
	ID       string `json:"id"`
	Resource string `json:"resource"`
	Method   string `json:"method"`
	Kind     string `json:"kind"`

	V       int             `json:"v,omitempty"`
	Ts      *int64          `json:"ts,omitempty"`
	Session string          `json:"session,omitempty"`
	From    string          `json:"from,omitempty"`
	To      json.RawMessage `json:"to,omitempty"`
	Topic   string          `json:"topic,omitempty"`
	ReplyTo string          `json:"replyTo,omitempty"`
	Meta    map[string]any  `json:"meta,omitempty"`

	Delivery *DeliveryOptions `json:"delivery,omitempty"`
	Priority string           `json:"priority,omitempty"`
	TTL      *int64           `json:"ttl,omitempty"`
}

// DeliveryOptions controls how a message is delivered.
type DeliveryOptions struct {
	Reliability     string `json:"reliability,omitempty"`
	Ordering        string `json:"ordering,omitempty"`
	PreferTransport string `json:"preferTransport,omitempty"`
	Fallback        *bool  `json:"fallback,omitempty"`
	IncludeSelf     *bool  `json:"includeSelf,omitempty"`
	RequireAck      *bool  `json:"requireAck,omitempty"`
}

// StarfishError is a structured protocol error.
type StarfishError struct {
	Code     string          `json:"code"`
	Resource string          `json:"resource,omitempty"`
	Message  string          `json:"message"`
	Retry    bool            `json:"retry"`
	Details  json.RawMessage `json:"details,omitempty"`
}

// ToJSON serializes a Frame to JSON bytes.
func (f *Frame) ToJSON() ([]byte, error) {
	return json.Marshal(f)
}

// ParseTo extracts the "to" field as a slice of strings.
// Handles both "clientId" and ["clientId1", "clientId2"].
func ParseTo(raw json.RawMessage) ([]string, error) {
	if len(raw) == 0 {
		return nil, nil
	}

	// Try single string first
	var single string
	if err := json.Unmarshal(raw, &single); err == nil {
		return []string{single}, nil
	}

	// Try array of strings
	var multi []string
	if err := json.Unmarshal(raw, &multi); err != nil {
		return nil, err
	}
	return multi, nil
}

// IncludeSelf returns whether the frame's delivery options specify includeSelf.
func (f *Frame) IncludeSelf() bool {
	if f.Header.Delivery != nil && f.Header.Delivery.IncludeSelf != nil {
		return *f.Header.Delivery.IncludeSelf
	}
	return false
}

// RequireAck returns whether the frame requests acknowledgement.
func (f *Frame) RequireAck() bool {
	if f.Header.Delivery != nil && f.Header.Delivery.RequireAck != nil {
		return *f.Header.Delivery.RequireAck
	}
	return false
}

// payloadAs unmarshals a frame's payload into a typed struct.
func payloadAs[T any](f *Frame) (T, error) {
	var v T
	data, err := json.Marshal(f.Payload)
	if err != nil {
		return v, err
	}
	err = json.Unmarshal(data, &v)
	return v, err
}

// marshalPayload converts a struct to map[string]any for frame payloads.
func marshalPayload(v any) map[string]any {
	data, _ := json.Marshal(v)
	var m map[string]any
	json.Unmarshal(data, &m)
	return m
}
