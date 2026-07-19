package starfish

import (
	"context"
	"fmt"
	"sync"
	"time"

	"nhooyr.io/websocket"
)

const defaultRequestTimeout = 10 * time.Second

// connection manages the WebSocket lifecycle, read loop, and frame dispatch.
type connection struct {
	mu   sync.Mutex
	ws   *websocket.Conn
	idg  *IDGenerator
	pend *pendingRequests
	bus  *eventBus

	cancel context.CancelFunc // cancels the read loop
}

func newConnection(idg *IDGenerator, bus *eventBus) *connection {
	return &connection{
		idg:  idg,
		pend: newPendingRequests(),
		bus:  bus,
	}
}

// dial opens a WebSocket connection to the server.
func (c *connection) dial(ctx context.Context, url string) error {
	ws, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		return fmt.Errorf("starfish: dial failed: %w", err)
	}
	ws.SetReadLimit(int64(MaxWSMessageSize) * 2) // allow some headroom for server messages

	c.mu.Lock()
	c.ws = ws
	c.mu.Unlock()

	return nil
}

// startReadLoop starts a goroutine that reads frames and dispatches them.
func (c *connection) startReadLoop(ctx context.Context) {
	ctx, cancel := context.WithCancel(ctx)
	c.mu.Lock()
	c.cancel = cancel
	c.mu.Unlock()

	go c.readLoop(ctx)
}

func (c *connection) readLoop(ctx context.Context) {
	for {
		_, data, err := c.ws.Read(ctx)
		if err != nil {
			// Connection closed or context cancelled
			return
		}

		frame, err := UnmarshalFrame(data)
		if err != nil {
			continue // skip malformed frames
		}

		// Try to resolve a pending request first
		if c.pend.resolve(frame) {
			continue
		}

		// Dispatch to event bus
		c.bus.dispatch(frame)
	}
}

// send serializes and writes a frame to the WebSocket.
func (c *connection) send(ctx context.Context, f *Frame) error {
	data, err := MarshalFrame(f)
	if err != nil {
		return fmt.Errorf("starfish: marshal failed: %w", err)
	}

	if err := ValidatePayloadSize(data, MaxWSMessageSize, "WebSocket message"); err != nil {
		return err
	}

	c.mu.Lock()
	ws := c.ws
	c.mu.Unlock()

	if ws == nil {
		return fmt.Errorf("starfish: not connected")
	}

	return ws.Write(ctx, websocket.MessageText, data)
}

// sendAndWait sends a frame and waits for a reply correlated by message ID.
func (c *connection) sendAndWait(ctx context.Context, f *Frame, timeout time.Duration) (*Frame, error) {
	if timeout == 0 {
		timeout = defaultRequestTimeout
	}

	ch := c.pend.add(f.Header.ID, timeout)

	if err := c.send(ctx, f); err != nil {
		// Remove the pending entry on send failure
		c.pend.resolve(&Frame{Header: Header{ReplyTo: f.Header.ID}})
		return nil, err
	}

	select {
	case reply, ok := <-ch:
		if !ok {
			return nil, fmt.Errorf("starfish: request timed out (id=%s)", f.Header.ID)
		}
		// Check if the reply is an error
		if sfErr := ParseErrorPayload(reply.Payload); sfErr != nil {
			return nil, &RequestError{RequestID: f.Header.ID, Err: sfErr}
		}
		return reply, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// close shuts down the WebSocket connection and read loop.
func (c *connection) close() {
	c.mu.Lock()
	cancel := c.cancel
	ws := c.ws
	c.ws = nil
	c.cancel = nil
	c.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	c.pend.rejectAll()
	if ws != nil {
		ws.Close(websocket.StatusNormalClosure, "")
	}
}
