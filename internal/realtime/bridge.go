package realtime

import (
	"context"
	"net"
	"strings"
	"sync/atomic"
	"time"

	"github.com/enjoys-in/secureflow/internal/websocket"
	"github.com/enjoys-in/secureflow/pkg/logger"
)

// maxEventsPerSecond caps how many traffic events are forwarded to WebSocket
// clients per second to prevent browser tab overload.
const maxEventsPerSecond = 20

// isInternalTraffic returns true if the traffic is loopback, link-local,
// same-host, or otherwise not real inbound/outbound traffic.
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
	if src.IsLinkLocalUnicast() || dst.IsLinkLocalUnicast() {
		return true
	}

	// Multicast / broadcast
	if dst.IsMulticast() || dst.IsUnspecified() || strings.HasSuffix(dstIP, ".255") {
		return true
	}

	return false
}

// Bridge connects the NFLOG traffic monitor to the WebSocket hub.
// Every captured packet is forwarded as a WebSocket Event to all connected
// browser clients, after filtering internal traffic and applying rate limiting.
type Bridge struct {
	monitor *NFLOGMonitor
	hub     *websocket.Hub
	logger  *logger.Logger
	emitted atomic.Int64 // events emitted in the current window
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
	// Reset the rate-limit counter every second
	go func() {
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				b.emitted.Store(0)
			}
		}
	}()

	b.monitor.SetCallback(func(event TrafficEvent) {
		// 1) Skip internal/loopback traffic — only forward inbound & outbound
		if isInternalTraffic(event.SrcIP, event.DstIP) {
			return
		}

		// 2) Rate limit — drop excess events to prevent browser overload
		if b.emitted.Add(1) > int64(maxEventsPerSecond) {
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
