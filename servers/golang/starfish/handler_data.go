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
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	var payload dataSavePayload
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Key == "" || (payload.Scope != "session" && payload.Scope != "self") {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if len(payload.Data) > MaxDataValueSize {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPayloadTooLarge, nil))
		return
	}

	sess := h.hub.GetSession(f.Session)
	if sess == nil {
		return
	}

	entry, err := sess.data.Apply(payload.Op, payload.Key, payload.Scope, c.id, payload.Data, payload.ExpectedVersion)
	if err != nil {
		if conflict, ok := err.(*ConflictError); ok {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrDataConflict, struct {
				Key             string          `json:"key"`
				ExpectedVersion int64           `json:"expectedVersion"`
				ActualVersion   int64           `json:"actualVersion"`
				CurrentData     json.RawMessage `json:"currentData"`
			}{
				Key:             payload.Key,
				ExpectedVersion: *payload.ExpectedVersion,
				ActualVersion:   conflict.ActualVersion,
				CurrentData:     conflict.CurrentData,
			}))
			return
		}
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrDataInvalidOp, nil))
		return
	}

	// Reply with data.saved
	savedPayload, _ := json.Marshal(struct {
		Key     string          `json:"key"`
		Scope   string          `json:"scope"`
		Data    json.RawMessage `json:"data"`
		Version int64           `json:"version"`
	}{
		Key:     payload.Key,
		Scope:   payload.Scope,
		Data:    entry.Data,
		Version: entry.Version,
	})

	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "data.saved",
		Session: f.Session,
		ReplyTo: f.ID,
		Payload: savedPayload,
	})

	// Broadcast data.changed for session-scoped data
	if payload.Scope == "session" {
		changedPayload, _ := json.Marshal(struct {
			Key       string          `json:"key"`
			Scope     string          `json:"scope"`
			Op        string          `json:"op"`
			Data      json.RawMessage `json:"data"`
			Version   int64           `json:"version"`
			UpdatedBy string          `json:"updatedBy"`
		}{
			Key:       payload.Key,
			Scope:     payload.Scope,
			Op:        payload.Op,
			Data:      entry.Data,
			Version:   entry.Version,
			UpdatedBy: c.id,
		})

		sess.Broadcast(&Frame{
			V:       1,
			ID:      h.hub.idGen.MessageID(),
			Type:    "data.changed",
			Session: f.Session,
			Payload: changedPayload,
		}, "")
	}
}

func (h *Handler) handleDataGet(c *Client, f *Frame) {
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	var payload dataGetPayload
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Key == "" || (payload.Scope != "session" && payload.Scope != "self") {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	sess := h.hub.GetSession(f.Session)
	if sess == nil {
		return
	}

	entry := sess.data.Get(payload.Key, payload.Scope, c.id)

	valuePayload, _ := json.Marshal(struct {
		Key     string          `json:"key"`
		Scope   string          `json:"scope"`
		Data    json.RawMessage `json:"data"`
		Version int64           `json:"version"`
	}{
		Key:     payload.Key,
		Scope:   payload.Scope,
		Data:    entry.Data,
		Version: entry.Version,
	})

	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "data.value",
		Session: f.Session,
		ReplyTo: f.ID,
		Payload: valuePayload,
	})
}
