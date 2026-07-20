package starfish

import (
	"context"
	"time"
)

// SendOptions configures a direct message or broadcast.
type SendOptions struct {
	Delivery *DeliveryOptions
	Priority string
	TTL      *int64
}

// messagingManager handles direct messaging and broadcast.
type messagingManager struct {
	conn    *connection
	idg     *IDGenerator
	session func() string
}

func newMessagingManager(conn *connection, idg *IDGenerator, session func() string) *messagingManager {
	return &messagingManager{
		conn:    conn,
		idg:     idg,
		session: session,
	}
}

// send delivers a direct message to one or more peers.
func (m *messagingManager) send(ctx context.Context, to string, payload map[string]any, opts *SendOptions) error {
	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       m.idg.Next("send"),
			Resource: "message",
			Method:   "send",
			Kind:     "request",
			Session:  m.session(),
			To:       SingleTarget(to),
			Ts:       &ts,
		},
		Payload: payload,
	}

	if opts != nil {
		frame.Header.Delivery = opts.Delivery
		frame.Header.Priority = opts.Priority
		frame.Header.TTL = opts.TTL
	}

	return m.conn.send(ctx, frame)
}

// sendMulti delivers a direct message to multiple peers.
func (m *messagingManager) sendMulti(ctx context.Context, to []string, payload map[string]any, opts *SendOptions) error {
	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       m.idg.Next("send"),
			Resource: "message",
			Method:   "send",
			Kind:     "request",
			Session:  m.session(),
			To:       MultiTarget(to...),
			Ts:       &ts,
		},
		Payload: payload,
	}

	if opts != nil {
		frame.Header.Delivery = opts.Delivery
		frame.Header.Priority = opts.Priority
		frame.Header.TTL = opts.TTL
	}

	return m.conn.send(ctx, frame)
}

// broadcast sends a message to all peers in the session.
func (m *messagingManager) broadcast(ctx context.Context, payload map[string]any, opts *SendOptions) error {
	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       m.idg.Next("broadcast"),
			Resource: "session",
			Method:   "broadcast",
			Kind:     "request",
			Session:  m.session(),
			Ts:       &ts,
		},
		Payload: payload,
	}

	if opts != nil {
		frame.Header.Delivery = opts.Delivery
		frame.Header.Priority = opts.Priority
		frame.Header.TTL = opts.TTL
	}

	return m.conn.send(ctx, frame)
}
