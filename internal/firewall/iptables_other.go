//go:build !linux

package firewall

import (
	"fmt"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// IPTablesBackend is a development stub for non-Linux platforms.
// On Linux, the real implementation in iptables_linux.go is used instead.
type IPTablesBackend struct {
	logger *logger.Logger
	rules  map[string]Rule
}

// NewIPTablesBackend creates a stub iptables backend (non-Linux).
func NewIPTablesBackend(log *logger.Logger) (*IPTablesBackend, error) {
	log.Info("iptables: using in-memory stub (non-Linux platform)")
	return &IPTablesBackend{
		logger: log,
		rules:  make(map[string]Rule),
	}, nil
}

func (b *IPTablesBackend) ListRules() ([]Rule, error) {
	out := make([]Rule, 0, len(b.rules))
	for _, r := range b.rules {
		out = append(out, r)
	}
	return out, nil
}

func (b *IPTablesBackend) AddRule(rule Rule) error {
	b.rules[rule.ID] = rule
	b.logger.Info("iptables-stub: rule added", "rule_id", rule.ID, "port", rule.Port)
	return nil
}

func (b *IPTablesBackend) DeleteRule(id string) error {
	if _, ok := b.rules[id]; !ok {
		return fmt.Errorf("iptables-stub: rule %s not found", id)
	}
	delete(b.rules, id)
	b.logger.Info("iptables-stub: rule deleted", "rule_id", id)
	return nil
}

func (b *IPTablesBackend) Flush() error {
	b.rules = make(map[string]Rule)
	b.logger.Info("iptables-stub: all rules flushed")
	return nil
}

func (b *IPTablesBackend) EnsurePort(port int, protocol, action string) error {
	ruleID := fmt.Sprintf("immutable-%s-%d", protocol, port)
	if _, ok := b.rules[ruleID]; ok {
		return nil
	}
	b.rules[ruleID] = Rule{
		ID: ruleID, Direction: "inbound", Protocol: protocol,
		Port: port, SourceCIDR: "0.0.0.0/0", Action: action,
	}
	b.logger.Info("iptables-stub: port ensured", "port", port)
	return nil
}
