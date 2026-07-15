package starfish

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"nhooyr.io/websocket"
)

// Client represents a connected WebSocket client.
type Client struct {
	mu   sync.Mutex
	id   string
	conn *websocket.Conn
	send chan []byte
	hub  *Server

	// Identity from client.hello
	name       string
	role       string
	meta       json.RawMessage
	rtcCapable bool

	// Session memberships: sessionName -> true
	sessions map[string]bool

	// Topic subscriptions per session: sessionName -> set of topic names
	topics map[string]map[string]bool

	// Presence per session: sessionName -> presence payload
	presence map[string]json.RawMessage

	// Heartbeat tracking
	lastActivity time.Time

	// Set to true after client.hello is processed
	authenticated bool

	ctx    context.Context
	cancel context.CancelFunc
}

// NewClient creates a new Client for a WebSocket connection.
func NewClient(hub *Server, conn *websocket.Conn) *Client {
	ctx, cancel := context.WithCancel(context.Background())
	return &Client{
		conn:         conn,
		send:         make(chan []byte, 256),
		hub:          hub,
		sessions:     make(map[string]bool),
		topics:       make(map[string]map[string]bool),
		presence:     make(map[string]json.RawMessage),
		lastActivity: time.Now(),
		ctx:          ctx,
		cancel:       cancel,
	}
}

// SendFrame marshals and queues a frame for delivery.
func (c *Client) SendFrame(f *Frame) {
	data, err := f.ToJSON()
	if err != nil {
		log.Printf("error marshaling frame for client %s: %v", c.id, err)
		return
	}
	select {
	case c.send <- data:
	default:
		log.Printf("send buffer full for client %s, dropping message", c.id)
	}
}

// Close terminates the client connection.
func (c *Client) Close() {
	c.cancel()
	c.conn.Close(websocket.StatusNormalClosure, "")
}

// ReadPump reads messages from the WebSocket and dispatches them.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.RemoveClient(c)
	}()

	c.conn.SetReadLimit(MaxWSMessageSize)

	for {
		_, data, err := c.conn.Read(c.ctx)
		if err != nil {
			return
		}

		c.mu.Lock()
		c.lastActivity = time.Now()
		c.mu.Unlock()

		var f Frame
		if err := json.Unmarshal(data, &f); err != nil {
			c.SendFrame(NewErrorFrame(c.hub.idGen, "", ErrProtocolInvalidFrame, nil))
			continue
		}

		if f.V != 1 {
			c.SendFrame(NewErrorFrame(c.hub.idGen, f.ID, ErrProtocolUnsupportedVer, nil))
			continue
		}

		if f.ID == "" || f.Type == "" {
			c.SendFrame(NewErrorFrame(c.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
			continue
		}

		c.hub.handler.Dispatch(c, &f)
	}
}

// WritePump drains the send channel and writes messages to the WebSocket.
func (c *Client) WritePump() {
	defer c.conn.Close(websocket.StatusNormalClosure, "")

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			if err := c.conn.Write(c.ctx, websocket.MessageText, msg); err != nil {
				return
			}
		case <-c.ctx.Done():
			return
		}
	}
}

// ClientInfo is the public representation of a client in a session.
type ClientInfo struct {
	ID   string          `json:"id"`
	Name string          `json:"name,omitempty"`
	Role string          `json:"role,omitempty"`
	Meta json.RawMessage `json:"meta,omitempty"`
}

// Info returns the public ClientInfo for this client.
func (c *Client) Info() ClientInfo {
	c.mu.Lock()
	defer c.mu.Unlock()
	return ClientInfo{
		ID:   c.id,
		Name: c.name,
		Role: c.role,
		Meta: c.meta,
	}
}
