package starfish

// Transport represents a message transport layer.
type Transport string

const (
	TransportWS  Transport = "ws"
	TransportRTC Transport = "rtc"
)

// selectTransport determines which transport to use for a given frame.
// Currently always returns WebSocket; RTC support will be added later.
func selectTransport(_ *Frame, _ *DeliveryOptions) Transport {
	return TransportWS
}
