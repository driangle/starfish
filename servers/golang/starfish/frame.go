package starfish

import "encoding/json"

// Frame is the canonical Starfish message envelope.
type Frame struct {
	V         int              `json:"v"`
	ID        string           `json:"id"`
	Type      string           `json:"type"`
	Ts        *int64           `json:"ts,omitempty"`
	Session   string           `json:"session,omitempty"`
	From      string           `json:"from,omitempty"`
	To        json.RawMessage  `json:"to,omitempty"`
	Topic     string           `json:"topic,omitempty"`
	Ack       *bool            `json:"ack,omitempty"`
	ReplyTo   string           `json:"replyTo,omitempty"`
	Transport string           `json:"transport,omitempty"`
	Options   *Options         `json:"options,omitempty"`
	Payload   json.RawMessage  `json:"payload,omitempty"`
	Error     *StarfishError   `json:"error,omitempty"`
}

type Options struct {
	Delivery   *Delivery `json:"delivery,omitempty"`
	Priority   string    `json:"priority,omitempty"`
	TTL        *int64    `json:"ttl,omitempty"`
	RequireAck *bool     `json:"requireAck,omitempty"`
}

type Delivery struct {
	Reliability     string `json:"reliability,omitempty"`
	Ordering        string `json:"ordering,omitempty"`
	PreferTransport string `json:"preferTransport,omitempty"`
	Fallback        *bool  `json:"fallback,omitempty"`
	IncludeSelf     *bool  `json:"includeSelf,omitempty"`
}

type StarfishError struct {
	Code    string          `json:"code"`
	Message string          `json:"message"`
	Details json.RawMessage `json:"details,omitempty"`
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
	if f.Options != nil && f.Options.Delivery != nil && f.Options.Delivery.IncludeSelf != nil {
		return *f.Options.Delivery.IncludeSelf
	}
	return false
}

// RequireAck returns whether the frame requests acknowledgement.
func (f *Frame) RequireAck() bool {
	if f.Options != nil && f.Options.RequireAck != nil {
		return *f.Options.RequireAck
	}
	return false
}
