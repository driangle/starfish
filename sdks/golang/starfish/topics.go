package starfish

import (
	"context"
	"time"
)

// topicManager handles topic subscribe/unsubscribe/publish.
type topicManager struct {
	conn    *connection
	idg     *IDGenerator
	session func() string
}

func newTopicManager(conn *connection, idg *IDGenerator, session func() string) *topicManager {
	return &topicManager{
		conn:    conn,
		idg:     idg,
		session: session,
	}
}

// subscribe sends a topic.subscribe request.
func (t *topicManager) subscribe(ctx context.Context, topic string) error {
	if err := ValidateTopicName(topic); err != nil {
		return err
	}

	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       t.idg.Next("topic"),
			Resource: "topic",
			Method:   "subscribe",
			Kind:     "request",
			Session:  t.session(),
			Topic:    topic,
			Ts:       &ts,
		},
	}

	_, err := t.conn.sendAndWait(ctx, frame, 0)
	return err
}

// unsubscribe sends a topic.unsubscribe request.
func (t *topicManager) unsubscribe(ctx context.Context, topic string) error {
	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       t.idg.Next("topic"),
			Resource: "topic",
			Method:   "unsubscribe",
			Kind:     "request",
			Session:  t.session(),
			Topic:    topic,
			Ts:       &ts,
		},
	}

	return t.conn.send(ctx, frame)
}

// PublishOptions configures a topic publish.
type PublishOptions struct {
	Delivery *DeliveryOptions
	Priority string
	TTL      *int64
}

// publish sends a topic.publish message.
func (t *topicManager) publish(ctx context.Context, topic string, payload map[string]any, opts *PublishOptions) error {
	if err := ValidateTopicName(topic); err != nil {
		return err
	}

	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       t.idg.Next("topic"),
			Resource: "topic",
			Method:   "publish",
			Kind:     "request",
			Session:  t.session(),
			Topic:    topic,
			Ts:       &ts,
		},
		Payload: payload,
	}

	if opts != nil {
		frame.Header.Delivery = opts.Delivery
		frame.Header.Priority = opts.Priority
		frame.Header.TTL = opts.TTL
	}

	return t.conn.send(ctx, frame)
}
