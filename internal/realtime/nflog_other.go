//go:build !linux

package realtime

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// NFLOGMonitor is a development stub for non-Linux platforms.
// It generates synthetic traffic events so the frontend can be developed
// and tested without a real Linux kernel.
type NFLOGMonitor struct {
	logger   *logger.Logger
	callback TrafficCallback
	mu       sync.RWMutex
}

// NewNFLOGMonitor creates a stub monitor (non-Linux).
func NewNFLOGMonitor(log *logger.Logger) *NFLOGMonitor {
	log.Info("NFLOG: using synthetic stub (non-Linux platform)")
	return &NFLOGMonitor{logger: log}
}

// SetCallback registers the function that receives every captured event.
func (m *NFLOGMonitor) SetCallback(cb TrafficCallback) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.callback = cb
}

// Start generates synthetic traffic events until ctx is cancelled.
func (m *NFLOGMonitor) Start(ctx context.Context) error {
	m.logger.Info("NFLOG stub: generating synthetic traffic events")

	ticker := time.NewTicker(800 * time.Millisecond)
	defer ticker.Stop()

	protocols := []string{"TCP", "UDP", "ICMP"}
	actions := []string{"ACCEPT", "DROP", "ACCEPT", "ACCEPT", "REJECT", "ACCEPT"} // weighted towards ACCEPT
	srcIPs := []string{
		"192.168.1.100", "10.0.0.50", "172.16.0.23", "8.8.8.8",
		"203.0.113.42", "198.51.100.7", "185.220.101.1", "91.189.88.142",
	}
	ports := []int{22, 80, 443, 3306, 5432, 8080, 8443, 6379, 25, 53, 993, 587}

	for {
		select {
		case <-ctx.Done():
			m.logger.Info("NFLOG stub: stopped")
			return nil
		case <-ticker.C:
			m.mu.RLock()
			cb := m.callback
			m.mu.RUnlock()
			if cb == nil {
				continue
			}

			proto := protocols[rand.Intn(len(protocols))]
			action := actions[rand.Intn(len(actions))]
			srcPort := 10000 + rand.Intn(55535)
			dstPort := ports[rand.Intn(len(ports))]

			event := TrafficEvent{
				Timestamp: time.Now(),
				SrcIP:     srcIPs[rand.Intn(len(srcIPs))],
				DstIP:     fmt.Sprintf("10.0.0.%d", 1+rand.Intn(10)),
				SrcPort:   srcPort,
				DstPort:   dstPort,
				Protocol:  proto,
				Length:    64 + rand.Intn(1400),
				Action:    action,
				Prefix:    fmt.Sprintf("FM:INPUT:%s:", action),
				InDev:     "eth0",
			}

			cb(event)
		}
	}
}
