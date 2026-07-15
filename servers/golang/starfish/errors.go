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

// Error messages matching the spec.
var errorMessages = map[string]string{
	ErrAuthRequired:           "Authentication required.",
	ErrAuthFailed:             "Authentication failed.",
	ErrSessionNotFound:        "Session does not exist.",
	ErrSessionFull:            "Session is at capacity.",
	ErrClientNotFound:         "Target client not found.",
	ErrTopicInvalid:           "Invalid topic name.",
	ErrTopicNotSubscribed:     "Client not subscribed to topic.",
	ErrTransportUnavailable:   "Requested transport not available.",
	ErrRTCFailed:              "RTC connection failed.",
	ErrDataInvalidOp:          "Invalid data operation.",
	ErrDataConflict:           "Version mismatch.",
	ErrDataForbidden:          "Not authorized for data operation.",
	ErrRateLimited:            "Client is sending too fast.",
	ErrPayloadTooLarge:        "Payload exceeds size limit.",
	ErrProtocolInvalidFrame:   "Malformed frame.",
	ErrProtocolUnsupportedVer: "Unsupported protocol version.",
	ErrResumeInvalid:          "Resume token is invalid.",
	ErrResumeExpired:          "Resume token has expired.",
	ErrInternalError:          "Server internal error.",

	// Pool errors
	ErrPoolNotFound:       "Pool does not exist.",
	ErrPoolNotMember:      "Client is not in this pool.",
	ErrPoolTargetNotFound: "Claim target is not in the pool.",
	ErrPoolAlreadyMatched: "Target was already matched.",
	ErrPoolModeMismatch:   "Operation not allowed in this pool mode.",
	ErrPoolRoleRequired:   "Operation requires matchmaker role.",
	ErrPoolInvalidGroup:   "Group does not match pool's group size.",
}

// NewErrorFrame creates an error response frame.
func NewErrorFrame(gen *IDGenerator, replyTo string, code string, details any) *Frame {
	msg, ok := errorMessages[code]
	if !ok {
		msg = "Unknown error."
	}

	f := &Frame{
		V:       1,
		ID:      gen.MessageID(),
		Type:    "error",
		ReplyTo: replyTo,
		Error: &StarfishError{
			Code:    code,
			Message: msg,
		},
	}

	if details != nil {
		if raw, err := json.Marshal(details); err == nil {
			f.Error.Details = raw
		}
	}

	return f
}
