package starfish

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Client is the main Starfish protocol client.
type Client struct {
	mu   sync.RWMutex
	opts ClientOptions

	state       ConnectionState
	clientID    string
	resumeToken string

	conn      *connection
	idg       *IDGenerator
	bus       *eventBus
	hb        *heartbeat
	session   *sessionManager
	topics    *topicManager
	messaging *messagingManager
	presence  *presenceManager
	data      *dataManager
	clock     *clockManager

	stateHandlers []func(ConnectionState)
	cancelReconn  context.CancelFunc
}

// NewClient creates a new Starfish client with the given options.
func NewClient(opts ClientOptions) *Client {
	idg := &IDGenerator{}
	bus := newEventBus()
	conn := newConnection(idg, bus)

	c := &Client{
		opts:  opts,
		state: Disconnected,
		idg:   idg,
		bus:   bus,
		conn:  conn,
	}

	c.hb = newHeartbeat(conn, idg)
	c.session = newSessionManager(conn, idg)
	c.topics = newTopicManager(conn, idg, c.session.currentSession)
	c.messaging = newMessagingManager(conn, idg, c.session.currentSession)
	c.presence = newPresenceManager(conn, idg, c.session.currentSession)
	c.data = newDataManager(conn, idg, c.session.currentSession)
	c.clock = newClockManager(conn, idg)

	// Register internal frame handlers
	bus.on(EventFilter{Resource: "client"}, c.session.handleFrame)
	bus.on(EventFilter{Resource: "presence"}, c.presence.handleFrame)

	return c
}

// Connect establishes a WebSocket connection and performs the handshake.
func (c *Client) Connect(ctx context.Context) error {
	c.setState(Connecting)

	if err := c.conn.dial(ctx, c.opts.Server); err != nil {
		c.setState(Disconnected)
		return err
	}

	// Start read loop before handshake so we can receive the welcome
	c.conn.startReadLoop(ctx)

	// Send hello
	var helloFrame *Frame
	if c.resumeToken != "" {
		helloFrame = NewResumeFrame(c.idg, c.resumeToken)
	} else {
		helloFrame = NewHelloFrame(c.idg, &c.opts)
	}

	reply, err := c.conn.sendAndWait(ctx, helloFrame, 10*time.Second)
	if err != nil {
		c.conn.close()
		c.setState(Disconnected)
		return fmt.Errorf("starfish: handshake failed: %w", err)
	}

	welcome, sfErr := ParseWelcome(reply)
	if sfErr != nil {
		c.conn.close()
		c.setState(Disconnected)
		return sfErr
	}

	c.mu.Lock()
	c.clientID = welcome.ClientID
	c.resumeToken = welcome.ResumeToken
	c.mu.Unlock()

	// Set initial clock offset from welcome
	if welcome.ServerTime > 0 {
		c.clock.setInitialOffset(welcome.ServerTime)
	}

	// Start heartbeat
	c.hb.start(ctx, welcome.HeartbeatInterval)

	c.setState(Connected)

	// Set up reconnection on disconnect
	c.setupReconnection(ctx)

	return nil
}

// Disconnect gracefully closes the connection.
func (c *Client) Disconnect() {
	c.mu.Lock()
	if c.cancelReconn != nil {
		c.cancelReconn()
		c.cancelReconn = nil
	}
	c.mu.Unlock()

	c.hb.stop()
	c.conn.close()
	c.presence.clear()
	c.setState(Disconnected)
}

// Join joins a session.
func (c *Client) Join(ctx context.Context, session string, opts *JoinOptions) (*JoinResult, error) {
	return c.session.join(ctx, session, opts)
}

// Leave leaves the current session.
func (c *Client) Leave(ctx context.Context) error {
	return c.session.leave(ctx)
}

// Subscribe subscribes to a topic in the current session.
func (c *Client) Subscribe(ctx context.Context, topic string) error {
	return c.topics.subscribe(ctx, topic)
}

// Unsubscribe unsubscribes from a topic.
func (c *Client) Unsubscribe(ctx context.Context, topic string) error {
	return c.topics.unsubscribe(ctx, topic)
}

// Publish publishes a message to a topic.
func (c *Client) Publish(ctx context.Context, topic string, payload map[string]any, opts *PublishOptions) error {
	return c.topics.publish(ctx, topic, payload, opts)
}

// Send delivers a direct message to a peer.
func (c *Client) Send(ctx context.Context, to string, payload map[string]any, opts *SendOptions) error {
	return c.messaging.send(ctx, to, payload, opts)
}

// SendMulti delivers a direct message to multiple peers.
func (c *Client) SendMulti(ctx context.Context, to []string, payload map[string]any, opts *SendOptions) error {
	return c.messaging.sendMulti(ctx, to, payload, opts)
}

// Broadcast sends a message to all peers in the session.
func (c *Client) Broadcast(ctx context.Context, payload map[string]any, opts *SendOptions) error {
	return c.messaging.broadcast(ctx, payload, opts)
}

// SetPresence updates the client's presence data.
func (c *Client) SetPresence(ctx context.Context, payload map[string]any) error {
	return c.presence.set(ctx, payload)
}

// Save writes a value to the shared data store.
func (c *Client) Save(ctx context.Context, opts *SaveOptions) (*DataResult, error) {
	return c.data.save(ctx, opts)
}

// Get reads a value from the shared data store.
func (c *Client) Get(ctx context.Context, opts *GetOptions) (*DataResult, error) {
	return c.data.get(ctx, opts)
}

// ClockSync synchronizes the clock with the server.
func (c *Client) ClockSync(ctx context.Context) error {
	return c.clock.sync(ctx, defaultClockSamples)
}

// ClockNow returns the estimated server time in unix milliseconds.
func (c *Client) ClockNow() int64 {
	return c.clock.now()
}

// ClockOffset returns the estimated clock offset in milliseconds.
func (c *Client) ClockOffset() int64 {
	return c.clock.getOffset()
}

// On registers an event handler with an optional filter. Returns an unsubscribe function.
func (c *Client) On(filter EventFilter, handler Handler) Unsubscribe {
	return c.bus.on(filter, handler)
}

// OnMessage registers a handler for incoming direct messages.
func (c *Client) OnMessage(handler Handler) Unsubscribe {
	return c.bus.on(EventFilter{Resource: "client", Method: "message"}, handler)
}

// OnPresence registers a handler for presence updates.
func (c *Client) OnPresence(handler Handler) Unsubscribe {
	return c.bus.on(EventFilter{Resource: "presence", Method: "updated"}, handler)
}

// OnDataChanged registers a handler for data change notifications.
func (c *Client) OnDataChanged(handler Handler) Unsubscribe {
	return c.bus.on(EventFilter{Resource: "data", Method: "changed"}, handler)
}

// OnConnectionChange registers a handler for connection state changes.
func (c *Client) OnConnectionChange(handler func(ConnectionState)) Unsubscribe {
	c.mu.Lock()
	c.stateHandlers = append(c.stateHandlers, handler)
	idx := len(c.stateHandlers) - 1
	c.mu.Unlock()

	return func() {
		c.mu.Lock()
		if idx < len(c.stateHandlers) {
			c.stateHandlers[idx] = nil
		}
		c.mu.Unlock()
	}
}

// ClientID returns the server-assigned client ID.
func (c *Client) ClientID() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.clientID
}

// State returns the current connection state.
func (c *Client) State() ConnectionState {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.state
}

// Clients returns all clients in the current session (including self).
func (c *Client) Clients() []ClientInfo {
	return c.session.getClients()
}

// Peers returns all clients in the current session except self.
func (c *Client) Peers() []ClientInfo {
	clientID := c.ClientID()
	clients := c.session.getClients()
	peers := make([]ClientInfo, 0, len(clients))
	for _, ci := range clients {
		if ci.ID != clientID {
			peers = append(peers, ci)
		}
	}
	return peers
}

// Presence returns the presence data for a given client.
func (c *Client) Presence(clientID string) map[string]any {
	return c.presence.get(clientID)
}

// PresenceAll returns all presence data.
func (c *Client) PresenceAll() map[string]map[string]any {
	return c.presence.getAll()
}

func (c *Client) setState(s ConnectionState) {
	c.mu.Lock()
	c.state = s
	handlers := make([]func(ConnectionState), len(c.stateHandlers))
	copy(handlers, c.stateHandlers)
	c.mu.Unlock()

	for _, h := range handlers {
		if h != nil {
			h(s)
		}
	}
}

func (c *Client) setupReconnection(parentCtx context.Context) {
	reconnOpts := DefaultReconnectOptions()
	if c.opts.Reconnect != nil {
		reconnOpts = *c.opts.Reconnect
	}
	if !reconnOpts.Enabled {
		return
	}

	ctx, cancel := context.WithCancel(parentCtx)
	c.mu.Lock()
	c.cancelReconn = cancel
	c.mu.Unlock()

	// Monitor connection by subscribing to the read loop ending
	go func() {
		// Wait for context cancellation (which happens when conn.close is called)
		<-ctx.Done()

		c.mu.RLock()
		state := c.state
		c.mu.RUnlock()

		// Only reconnect if we didn't intentionally disconnect
		if state == Disconnected {
			return
		}

		c.reconnectLoop(reconnOpts)
	}()
}

func (c *Client) reconnectLoop(opts ReconnectOptions) {
	c.setState(Reconnecting)

	for attempt := 0; ; attempt++ {
		delay := computeReconnectDelay(attempt, opts)
		if delay == 0 {
			c.setState(Disconnected)
			return
		}

		time.Sleep(delay)

		ctx := context.Background()
		if err := c.conn.dial(ctx, c.opts.Server); err != nil {
			continue
		}

		c.conn.startReadLoop(ctx)

		// Try resume
		var helloFrame *Frame
		c.mu.RLock()
		token := c.resumeToken
		c.mu.RUnlock()
		if token != "" {
			helloFrame = NewResumeFrame(c.idg, token)
		} else {
			helloFrame = NewHelloFrame(c.idg, &c.opts)
		}

		reply, err := c.conn.sendAndWait(ctx, helloFrame, 10*time.Second)
		if err != nil {
			c.conn.close()
			continue
		}

		welcome, sfErr := ParseWelcome(reply)
		if sfErr != nil {
			c.conn.close()
			continue
		}

		c.mu.Lock()
		c.clientID = welcome.ClientID
		c.resumeToken = welcome.ResumeToken
		c.mu.Unlock()

		if welcome.ServerTime > 0 {
			c.clock.setInitialOffset(welcome.ServerTime)
		}

		c.hb.start(ctx, welcome.HeartbeatInterval)
		c.setState(Connected)
		c.setupReconnection(ctx)
		return
	}
}
