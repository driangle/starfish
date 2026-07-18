package starfish

import "time"

// HelloPayload is sent by the client during the initial handshake.
type HelloPayload struct {
	Versions    []int           `json:"versions"`
	Client      *ClientIdentity `json:"client,omitempty"`
	Auth        *AuthOptions    `json:"auth,omitempty"`
	ResumeToken string          `json:"resumeToken,omitempty"`
}

// WelcomePayload is returned by the server in response to a hello.
type WelcomePayload struct {
	Status            string `json:"status"`
	Version           int    `json:"version"`
	ClientID          string `json:"clientId"`
	ResumeToken       string `json:"resumeToken"`
	ResumeTimeout     int    `json:"resumeTimeout"`
	ServerTime        int64  `json:"serverTime"`
	HeartbeatInterval int    `json:"heartbeatInterval"`
	SessionRequired   bool   `json:"sessionRequired"`
}

// NewHelloFrame creates a hello frame for the initial handshake.
func NewHelloFrame(gen *IDGenerator, opts *ClientOptions) *Frame {
	ts := time.Now().UnixMilli()

	identity := &ClientIdentity{
		Name: "starfish-client",
		Role: "default",
		Meta: map[string]any{},
	}
	if opts.Client != nil {
		if opts.Client.Name != "" {
			identity.Name = opts.Client.Name
		}
		if opts.Client.Role != "" {
			identity.Role = opts.Client.Role
		}
		if opts.Client.Meta != nil {
			identity.Meta = opts.Client.Meta
		}
	}

	auth := &AuthOptions{Type: "none"}
	if opts.Auth != nil {
		auth = opts.Auth
	}

	payload := map[string]any{
		"versions": []int{2},
		"client": map[string]any{
			"name": identity.Name,
			"role": identity.Role,
			"meta": identity.Meta,
		},
		"auth": map[string]any{
			"type":  auth.Type,
			"token": auth.Token,
		},
	}

	return &Frame{
		Header: Header{
			V:        2,
			ID:       gen.Next("hello"),
			Resource: "client",
			Method:   "hello",
			Kind:     "request",
			Ts:       &ts,
		},
		Payload: payload,
	}
}

// NewResumeFrame creates a hello frame for resuming a previous connection.
func NewResumeFrame(gen *IDGenerator, resumeToken string) *Frame {
	ts := time.Now().UnixMilli()
	return &Frame{
		Header: Header{
			V:        2,
			ID:       gen.Next("hello"),
			Resource: "client",
			Method:   "hello",
			Kind:     "request",
			Ts:       &ts,
		},
		Payload: map[string]any{
			"versions":    []int{2},
			"resumeToken": resumeToken,
		},
	}
}

// ParseWelcome extracts welcome data from a response frame's payload.
// Returns nil if the payload indicates an error.
func ParseWelcome(f *Frame) (*WelcomePayload, *StarfishError) {
	if f.Payload == nil {
		return nil, &StarfishError{
			Code:    "protocol.invalid_welcome",
			Message: "Welcome frame has no payload",
		}
	}

	if sfErr := ParseErrorPayload(f.Payload); sfErr != nil {
		return nil, sfErr
	}

	w := &WelcomePayload{
		HeartbeatInterval: 15000,
	}

	if v, ok := f.Payload["status"].(string); ok {
		w.Status = v
	}
	if v, ok := f.Payload["version"].(float64); ok {
		w.Version = int(v)
	}
	if v, ok := f.Payload["clientId"].(string); ok {
		w.ClientID = v
	}
	if v, ok := f.Payload["resumeToken"].(string); ok {
		w.ResumeToken = v
	}
	if v, ok := f.Payload["resumeTimeout"].(float64); ok {
		w.ResumeTimeout = int(v)
	}
	if v, ok := f.Payload["serverTime"].(float64); ok {
		w.ServerTime = int64(v)
	}
	if v, ok := f.Payload["heartbeatInterval"].(float64); ok {
		w.HeartbeatInterval = int(v)
	}
	if v, ok := f.Payload["sessionRequired"].(bool); ok {
		w.SessionRequired = v
	}

	return w, nil
}
