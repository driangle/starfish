package starfish

// ConnectionState represents the state of the client connection.
type ConnectionState string

const (
	Disconnected ConnectionState = "disconnected"
	Connecting   ConnectionState = "connecting"
	Connected    ConnectionState = "connected"
	Reconnecting ConnectionState = "reconnecting"
)

// Frame is the top-level protocol envelope containing a header and optional payload.
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

	V       int            `json:"v,omitempty"`
	Ts      *int64         `json:"ts,omitempty"`
	Session string         `json:"session,omitempty"`
	From    string         `json:"from,omitempty"`
	To      Target         `json:"to,omitempty"`
	Topic   string         `json:"topic,omitempty"`
	ReplyTo string         `json:"replyTo,omitempty"`
	Meta    map[string]any `json:"meta,omitempty"`

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

// HeaderOptions are optional fields a caller can set when sending messages.
type HeaderOptions struct {
	Delivery *DeliveryOptions `json:"delivery,omitempty"`
	Priority string           `json:"priority,omitempty"`
	TTL      *int64           `json:"ttl,omitempty"`
	Meta     map[string]any   `json:"meta,omitempty"`
}

// ClientIdentity identifies the client during handshake.
type ClientIdentity struct {
	Name string         `json:"name,omitempty"`
	Role string         `json:"role,omitempty"`
	Meta map[string]any `json:"meta,omitempty"`
}

// AuthOptions configures authentication for the handshake.
type AuthOptions struct {
	Type  string `json:"type"`
	Token string `json:"token,omitempty"`
}

// ReconnectOptions configures automatic reconnection behavior.
type ReconnectOptions struct {
	Enabled    bool    `json:"enabled"`
	MaxRetries float64 `json:"maxRetries"`
	BaseDelay  int     `json:"baseDelay"`
	MaxDelay   int     `json:"maxDelay"`
}

// DefaultReconnectOptions returns sensible reconnection defaults.
func DefaultReconnectOptions() ReconnectOptions {
	return ReconnectOptions{
		Enabled:    true,
		MaxRetries: -1, // infinite
		BaseDelay:  1000,
		MaxDelay:   30000,
	}
}

// ClientOptions configures a StarfishClient.
type ClientOptions struct {
	Server    string
	Client    *ClientIdentity
	Auth      *AuthOptions
	Reconnect *ReconnectOptions
}

// ClientInfo is a public representation of a connected client.
type ClientInfo struct {
	ID   string         `json:"id"`
	Name string         `json:"name,omitempty"`
	Role string         `json:"role,omitempty"`
	Meta map[string]any `json:"meta,omitempty"`
}

// EventFilter selects which frames to receive.
type EventFilter struct {
	Resource string
	Method   string
	Topic    string
	From     string
}
