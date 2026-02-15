package realtime

import (
	"context"
	"net"
	"strings"

	"github.com/enjoys-in/secureflow/internal/websocket"
	"github.com/enjoys-in/secureflow/pkg/logger"
)

// isInternalTraffic returns true if the traffic is loopback/link-local
// and should be excluded from the dashboard feed.
func isInternalTraffic(srcIP, dstIP string) bool {
	src := net.ParseIP(srcIP)
	dst := net.ParseIP(dstIP)

	if src == nil || dst == nil {
		return false
	}

	// Loopback (127.0.0.0/8 or ::1)
	if src.IsLoopback() || dst.IsLoopback() {
		return true
	}

	// Same IP talking to itself
	if src.Equal(dst) {
		return true
	}

	// Link-local (169.254.x.x, fe80::)
	if src.IsLinkLocalUnicast() && dst.IsLinkLocalUnicast() {
		return true
	}

	// Multicast / broadcast
	if dst.IsMulticast() || strings.HasSuffix(dstIP, ".255") {
		return true
	}

	return false
}

// Bridge connects the NFLOG traffic monitor to the WebSocket hub.
// Every packet captured by the kernel is forwarded as a WebSocket Event
// to all connected browser clients.
type Bridge struct {
	monitor *NFLOGMonitor
	hub     *websocket.Hub
	logger  *logger.Logger
}

// NewBridge creates a bridge between the traffic monitor and WebSocket hub.
func NewBridge(monitor *NFLOGMonitor, hub *websocket.Hub, log *logger.Logger) *Bridge {
	return &Bridge{
		monitor: monitor,
		hub:     hub,
		logger:  log,
	}
}

// Run wires the monitor callback to the hub and starts capturing.
// It blocks until ctx is cancelled.
func (b *Bridge) Run(ctx context.Context) error {
	b.monitor.SetCallback(func(event TrafficEvent) {
		// Skip internal/loopback traffic — only forward inbound & outbound
		if isInternalTraffic(event.SrcIP, event.DstIP) {
			return
		}

		b.hub.EmitTraffic(
			event.SrcIP,
			event.DstIP,
			event.Protocol,
			event.Action,
			event.DstPort,
		)
	})

	b.logger.Info("Traffic bridge started: NFLOG → WebSocket")
	return b.monitor.Start(ctx)
}
