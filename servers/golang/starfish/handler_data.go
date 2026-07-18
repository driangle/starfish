package starfish

import (
	"encoding/json"
)

type dataSavePayload struct {
	Key             string          `json:"key"`
	Scope           string          `json:"scope"`
	Op              string          `json:"op"`
	Data            json.RawMessage `json:"data"`
	ExpectedVersion *int64          `json:"expectedVersion,omitempty"`
}

type dataGetPayload struct {
	Key   string `json:"key"`
	Scope string `json:"scope"`
}

func (h *Handler) handleDataSave(c *Client, f *Frame) {
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "save", ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	payload, err := payloadAs[dataSavePayload](f)
	if err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "save", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Key == "" || (payload.Scope != "session" && payload.Scope != "self") {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "save", ErrProtocolInvalidFrame, nil))
		return
	}

	if len(payload.Data) > MaxDataValueSize {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "save", ErrPayloadTooLarge, nil))
		return
	}

	sess := h.hub.GetSession(f.Header.Session)
	if sess == nil {
		return
	}

	entry, applyErr := sess.data.Apply(payload.Op, payload.Key, payload.Scope, c.id, payload.Data, payload.ExpectedVersion)
	if applyErr != nil {
		if conflict, ok := applyErr.(*ConflictError); ok {
			errFrame := NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "save", ErrDataConflict, nil)
			errFrame.Payload["details"] = map[string]any{
				"key":             payload.Key,
				"expectedVersion": *payload.ExpectedVersion,
				"actualVersion":   conflict.ActualVersion,
				"currentData":     json.RawMessage(conflict.CurrentData),
			}
			c.SendFrame(errFrame)
			return
		}
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "save", ErrDataInvalidOp, nil))
		return
	}

	// Reply with data save response
	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "data",
			Method:   "save",
			Kind:     "response",
			Session:  f.Header.Session,
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status":  "ok",
			"key":     payload.Key,
			"scope":   payload.Scope,
			"data":    json.RawMessage(entry.Data),
			"version": entry.Version,
		},
	})

	// Broadcast data changed event for session-scoped data
	if payload.Scope == "session" {
		sess.Broadcast(&Frame{
			Header: Header{
				ID:       h.hub.idGen.MessageID(),
				Resource: "data",
				Method:   "changed",
				Kind:     "event",
				Session:  f.Header.Session,
			},
			Payload: map[string]any{
				"key":       payload.Key,
				"scope":     payload.Scope,
				"op":        payload.Op,
				"data":      json.RawMessage(entry.Data),
				"version":   entry.Version,
				"updatedBy": c.id,
			},
		}, "")
	}
}

func (h *Handler) handleDataGet(c *Client, f *Frame) {
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "get", ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	payload, err := payloadAs[dataGetPayload](f)
	if err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "get", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Key == "" || (payload.Scope != "session" && payload.Scope != "self") {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "data", "get", ErrProtocolInvalidFrame, nil))
		return
	}

	sess := h.hub.GetSession(f.Header.Session)
	if sess == nil {
		return
	}

	entry := sess.data.Get(payload.Key, payload.Scope, c.id)

	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "data",
			Method:   "get",
			Kind:     "response",
			Session:  f.Header.Session,
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status":  "ok",
			"key":     payload.Key,
			"scope":   payload.Scope,
			"data":    json.RawMessage(entry.Data),
			"version": entry.Version,
		},
	})
}
