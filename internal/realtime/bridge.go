package realtime

import (
	"context"

	"github.com/enjoys-in/secureflow/internal/websocket"
	"github.com/enjoys-in/secureflow/pkg/logger"
)

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
