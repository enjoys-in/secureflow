//go:build linux

package realtime

import (
	"context"
	"encoding/binary"
	"strings"
	"sync"
	"time"

	nflog "github.com/florianl/go-nflog/v2"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// NFLOGMonitor captures live traffic from the kernel using NFLOG (netlink).
// It requires an iptables/nftables rule that sends packets to NFLOG group 100.
//
// Architecture:
//
//	iptables -I INPUT  -j NFLOG --nflog-group 100 --nflog-prefix "FM:INPUT:"
//	iptables -I OUTPUT -j NFLOG --nflog-group 100 --nflog-prefix "FM:OUTPUT:"
//	               │
//	               ▼
//	Kernel sends packet metadata via AF_NETLINK(NETLINK_NETFILTER)
//	               │
//	               ▼
//	NFLOGMonitor (this code) ──► TrafficCallback ──► WebSocket Hub ──► browser
type NFLOGMonitor struct {
	logger   *logger.Logger
	callback TrafficCallback
	mu       sync.RWMutex
}

// NewNFLOGMonitor creates a new traffic monitor backed by NFLOG.
func NewNFLOGMonitor(log *logger.Logger) *NFLOGMonitor {
	return &NFLOGMonitor{
		logger: log,
	}
}

// SetCallback registers the function that receives every captured event.
func (m *NFLOGMonitor) SetCallback(cb TrafficCallback) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.callback = cb
}

// Start opens the NFLOG netlink socket and blocks until ctx is cancelled.
func (m *NFLOGMonitor) Start(ctx context.Context) error {
	config := nflog.Config{
		Group:       NFLOGGroup,
		Copymode:    nflog.CopyPacket,
		ReadTimeout: 10 * time.Millisecond,
	}

	nf, err := nflog.Open(&config)
	if err != nil {
		return err
	}
	defer nf.Close()

	m.logger.Info("NFLOG monitor started", "group", NFLOGGroup)

	// Register the hook that the kernel calls for every matching packet.
	hookFn := func(attrs nflog.Attribute) int {
		m.mu.RLock()
		cb := m.callback
		m.mu.RUnlock()
		if cb == nil {
			return 0
		}

		event := m.parseAttributes(attrs)
		cb(event)
		return 0
	}

	if err := nf.RegisterWithErrorFunc(ctx, hookFn, func(err error) int {
		// Don't log context-cancelled errors during shutdown.
		if ctx.Err() != nil {
			return 0
		}
		m.logger.Error("NFLOG error", "error", err)
		return 0
	}); err != nil {
		return err
	}

	// Block until context is cancelled.
	<-ctx.Done()
	m.logger.Info("NFLOG monitor stopped")
	return nil
}

// parseAttributes extracts a TrafficEvent from NFLOG attributes.
func (m *NFLOGMonitor) parseAttributes(attrs nflog.Attribute) TrafficEvent {
	event := TrafficEvent{
		Timestamp: time.Now(),
		Action:    "ACCEPT", // default; refined from prefix below
		Protocol:  "OTHER",
	}

	// NFLOG prefix (set via --nflog-prefix in iptables)
	if attrs.Prefix != nil {
		event.Prefix = strings.TrimRight(*attrs.Prefix, "\x00")
		// Parse our prefixes: "FM:INPUT:DROP:", "FM:OUTPUT:ACCEPT:" etc.
		event.Action = actionFromPrefix(event.Prefix)
	}

	// Raw payload — parse IP header for src/dst/proto/ports
	if attrs.Payload != nil && len(*attrs.Payload) >= 20 {
		pkt := *attrs.Payload
		event.Length = len(pkt)

		// IPv4 header
		ihl := int(pkt[0]&0x0F) * 4 // header length in bytes
		protoNum := int(pkt[9])
		event.Protocol = protoName(protoNum)
		event.SrcIP = ipFromBytes(pkt[12:16])
		event.DstIP = ipFromBytes(pkt[16:20])

		// Extract ports for TCP / UDP
		if (protoNum == 6 || protoNum == 17) && len(pkt) >= ihl+4 {
			event.SrcPort = int(binary.BigEndian.Uint16(pkt[ihl : ihl+2]))
			event.DstPort = int(binary.BigEndian.Uint16(pkt[ihl+2 : ihl+4]))
		}
	}

	return event
}

// actionFromPrefix extracts the firewall action from the NFLOG prefix string.
// Expected format: "FM:<CHAIN>:<ACTION>:" e.g. "FM:INPUT:DROP:"
func actionFromPrefix(prefix string) string {
	parts := strings.Split(prefix, ":")
	for _, p := range parts {
		upper := strings.ToUpper(strings.TrimSpace(p))
		switch upper {
		case "ACCEPT", "DROP", "REJECT":
			return upper
		}
	}
	return "ACCEPT"
}
