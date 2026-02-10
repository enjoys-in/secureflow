package realtime

import (
	"context"
	"net"
	"time"
)

// TrafficEvent represents a single packet/connection captured from the kernel.
type TrafficEvent struct {
	Timestamp time.Time `json:"timestamp"`
	SrcIP     string    `json:"src_ip"`
	DstIP     string    `json:"dst_ip"`
	SrcPort   int       `json:"src_port"`
	DstPort   int       `json:"dst_port"`
	Protocol  string    `json:"protocol"` // "TCP", "UDP", "ICMP", etc.
	Length    int       `json:"length"`   // packet length in bytes
	Action    string    `json:"action"`   // from the NFLOG prefix, e.g. "ACCEPT", "DROP"
	Prefix    string    `json:"prefix"`   // raw NFLOG prefix
	InDev     string    `json:"in_dev"`   // incoming interface name
	OutDev    string    `json:"out_dev"`  // outgoing interface name
}

// TrafficCallback is called for every captured traffic event.
type TrafficCallback func(event TrafficEvent)

// TrafficMonitor captures live kernel traffic via NFLOG/conntrack and
// delivers TrafficEvent values to a registered callback.
type TrafficMonitor interface {
	// Start begins capturing in the background. It blocks until ctx is cancelled.
	Start(ctx context.Context) error
	// SetCallback registers the function that receives every captured event.
	SetCallback(cb TrafficCallback)
}

// NFLOGGroup is the netfilter log group number our iptables/nftables rules log to.
const NFLOGGroup = 100

// protoName converts an IP protocol number to a human-readable name.
func protoName(proto int) string {
	switch proto {
	case 6:
		return "TCP"
	case 17:
		return "UDP"
	case 1:
		return "ICMP"
	case 2:
		return "IGMP"
	case 47:
		return "GRE"
	case 50:
		return "ESP"
	case 51:
		return "AH"
	default:
		return "OTHER"
	}
}

// ipFromBytes converts a 4-byte IPv4 address to a string.
func ipFromBytes(b []byte) string {
	if len(b) == 4 {
		return net.IPv4(b[0], b[1], b[2], b[3]).String()
	}
	if len(b) == 16 {
		return net.IP(b).String()
	}
	return ""
}
