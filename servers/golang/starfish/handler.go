package starfish

import "log"

// HandlerFunc processes a frame from a client.
type HandlerFunc func(c *Client, f *Frame)

// Handler dispatches incoming frames to the appropriate handler function.
type Handler struct {
	hub      *Hub
	handlers map[string]HandlerFunc
}

// NewHandler creates a Handler with all message type handlers registered.
func NewHandler(hub *Hub) *Handler {
	h := &Handler{
		hub:      hub,
		handlers: make(map[string]HandlerFunc),
	}

	// Connection
	h.handlers["client.hello"] = h.handleClientHello

	// Sessions
	h.handlers["session.join"] = h.requireAuth(h.handleSessionJoin)
	h.handlers["session.leave"] = h.requireAuth(h.handleSessionLeave)

	// Topics
	h.handlers["topic.subscribe"] = h.requireAuth(h.handleTopicSubscribe)
	h.handlers["topic.unsubscribe"] = h.requireAuth(h.handleTopicUnsubscribe)
	h.handlers["topic.publish"] = h.requireAuth(h.handleTopicPublish)

	// Messaging
	h.handlers["client.send"] = h.requireAuth(h.handleClientSend)
	h.handlers["session.broadcast"] = h.requireAuth(h.handleSessionBroadcast)

	// Presence
	h.handlers["presence.set"] = h.requireAuth(h.handlePresenceSet)

	// Data
	h.handlers["data.save"] = h.requireAuth(h.handleDataSave)
	h.handlers["data.get"] = h.requireAuth(h.handleDataGet)

	// System
	h.handlers["ping"] = h.handlePing
	h.handlers["clock.sync"] = h.handleClockSync
	h.handlers["ack"] = h.requireAuth(h.handleAck)
	h.handlers["nack"] = h.requireAuth(h.handleNack)

	// RTC signaling
	h.handlers["rtc.connect"] = h.requireAuth(h.handleRTCConnect)
	h.handlers["rtc.offer"] = h.requireAuth(h.handleRTCOffer)
	h.handlers["rtc.answer"] = h.requireAuth(h.handleRTCAnswer)
	h.handlers["rtc.ice"] = h.requireAuth(h.handleRTCIce)

	return h
}

// Dispatch routes a frame to the appropriate handler.
func (h *Handler) Dispatch(c *Client, f *Frame) {
	handler, ok := h.handlers[f.Type]
	if !ok {
		log.Printf("unknown message type: %s from client %s", f.Type, c.id)
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}
	handler(c, f)
}

// requireAuth wraps a handler to ensure the client has completed the handshake.
func (h *Handler) requireAuth(fn HandlerFunc) HandlerFunc {
	return func(c *Client, f *Frame) {
		if !c.authenticated {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrAuthRequired, nil))
			return
		}
		fn(c, f)
	}
}
