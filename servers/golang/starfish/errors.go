package starfish

import "encoding/json"

// Error codes defined by the Starfish v0.1 specification.
const (
	ErrAuthRequired           = "auth.required"
	ErrAuthFailed             = "auth.failed"
	ErrSessionNotFound        = "session.not_found"
	ErrSessionFull            = "session.full"
	ErrClientNotFound         = "client.not_found"
	ErrTopicInvalid           = "topic.invalid"
	ErrTopicNotSubscribed     = "topic.not_subscribed"
	ErrTransportUnavailable   = "transport.unavailable"
	ErrRTCFailed              = "rtc.failed"
	ErrDataInvalidOp          = "data.invalid_op"
	ErrDataConflict           = "data.conflict"
	ErrDataForbidden          = "data.forbidden"
	ErrRateLimited            = "rate_limited"
	ErrPayloadTooLarge        = "payload.too_large"
	ErrProtocolInvalidFrame   = "protocol.invalid_frame"
	ErrProtocolUnsupportedVer = "protocol.unsupported_version"
	ErrResumeInvalid          = "resume.invalid"
	ErrResumeExpired          = "resume.expired"
	ErrInternalError          = "internal_error"

	// Pool errors
	ErrPoolNotFound       = "pool.not_found"
	ErrPoolNotMember      = "pool.not_member"
	ErrPoolTargetNotFound = "pool.target_not_found"
	ErrPoolAlreadyMatched = "pool.already_matched"
	ErrPoolModeMismatch   = "pool.mode_mismatch"
	ErrPoolRoleRequired   = "pool.role_required"
	ErrPoolInvalidGroup   = "pool.invalid_group"
)

// errorInfo holds the message, default resource, and retry hint for each error code.
type errorInfo struct {
	Message  string
	Resource string
	Retry    bool
}

// errorRegistry maps error codes to their metadata per the v0.1 spec.
var errorRegistry = map[string]errorInfo{
	ErrAuthRequired:           {"Authentication required.", "client", false},
	ErrAuthFailed:             {"Authentication failed.", "client", false},
	ErrSessionNotFound:        {"Session does not exist.", "session", false},
	ErrSessionFull:            {"Session is at capacity.", "session", true},
	ErrClientNotFound:         {"Target client not found.", "message", false},
	ErrTopicInvalid:           {"Invalid topic name.", "topic", false},
	ErrTopicNotSubscribed:     {"Client not subscribed to topic.", "topic", false},
	ErrTransportUnavailable:   {"Requested transport not available.", "rtc", true},
	ErrRTCFailed:              {"RTC connection failed.", "rtc", true},
	ErrDataInvalidOp:          {"Invalid data operation.", "data", false},
	ErrDataConflict:           {"Version mismatch.", "data", true},
	ErrDataForbidden:          {"Not authorized for data operation.", "data", false},
	ErrRateLimited:            {"Client is sending too fast.", "", true},
	ErrPayloadTooLarge:        {"Payload exceeds size limit.", "", false},
	ErrProtocolInvalidFrame:   {"Malformed frame.", "", false},
	ErrProtocolUnsupportedVer: {"Unsupported protocol version.", "client", false},
	ErrResumeInvalid:          {"Resume token is invalid.", "client", false},
	ErrResumeExpired:          {"Resume token has expired.", "client", false},
	ErrInternalError:          {"Server internal error.", "", true},

	// Pool errors
	ErrPoolNotFound:       {"Pool does not exist.", "pool", false},
	ErrPoolNotMember:      {"Client is not in this pool.", "pool", false},
	ErrPoolTargetNotFound: {"Claim target is not in the pool.", "pool", false},
	ErrPoolAlreadyMatched: {"Target was already matched.", "pool", false},
	ErrPoolModeMismatch:   {"Operation not allowed in this pool mode.", "pool", false},
	ErrPoolRoleRequired:   {"Operation requires matchmaker role.", "pool", false},
	ErrPoolInvalidGroup:   {"Group does not match pool's group size.", "pool", false},
}

// NewErrorFrame creates a v0.1 error response frame.
// The resource and method identify which request this error responds to.
func NewErrorFrame(gen *IDGenerator, replyTo string, resource string, method string, code string, details any) *Frame {
	info, ok := errorRegistry[code]
	if !ok {
		info = errorInfo{Message: "Unknown error.", Resource: resource, Retry: false}
	}

	errResource := info.Resource
	if errResource == "" {
		errResource = resource
	}

	sfErr := &StarfishError{
		Code:     code,
		Resource: errResource,
		Message:  info.Message,
		Retry:    info.Retry,
	}

	if details != nil {
		if raw, err := json.Marshal(details); err == nil {
			sfErr.Details = raw
		}
	}

	payload := map[string]any{
		"status": "error",
		"error":  sfErr,
	}

	return &Frame{
		Header: Header{
			ID:       gen.MessageID(),
			Resource: resource,
			Method:   method,
			Kind:     "response",
			ReplyTo:  replyTo,
		},
		Payload: payload,
	}
}
