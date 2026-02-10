//go:build !linux

package firewall

import (
	"fmt"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// NFTablesBackend is a development stub for non-Linux platforms.
// On Linux, the real implementation in nftables_linux.go is used instead.
type NFTablesBackend struct {
	logger *logger.Logger
	rules  map[string]Rule
}

// NewNFTablesBackend creates a stub nftables backend (non-Linux).
func NewNFTablesBackend(log *logger.Logger) (*NFTablesBackend, error) {
	log.Info("nftables: using in-memory stub (non-Linux platform)")
	return &NFTablesBackend{
		logger: log,
		rules:  make(map[string]Rule),
	}, nil
}

func (b *NFTablesBackend) ListRules() ([]Rule, error) {
	out := make([]Rule, 0, len(b.rules))
	for _, r := range b.rules {
		out = append(out, r)
	}
	return out, nil
}

func (b *NFTablesBackend) AddRule(rule Rule) error {
	b.rules[rule.ID] = rule
	b.logger.Info("nftables-stub: rule added", "rule_id", rule.ID, "port", rule.Port)
	return nil
}

func (b *NFTablesBackend) DeleteRule(id string) error {
	if _, ok := b.rules[id]; !ok {
		return fmt.Errorf("nftables-stub: rule %s not found", id)
	}
	delete(b.rules, id)
	b.logger.Info("nftables-stub: rule deleted", "rule_id", id)
	return nil
}

func (b *NFTablesBackend) Flush() error {
	b.rules = make(map[string]Rule)
	b.logger.Info("nftables-stub: all rules flushed")
	return nil
}

func (b *NFTablesBackend) EnsurePort(port int, protocol, action string) error {
	ruleID := fmt.Sprintf("immutable-%s-%d", protocol, port)
	if _, ok := b.rules[ruleID]; ok {
		return nil
	}
	b.rules[ruleID] = Rule{
		ID: ruleID, Direction: "inbound", Protocol: protocol,
		Port: port, SourceCIDR: "0.0.0.0/0", Action: action,
	}
	b.logger.Info("nftables-stub: port ensured", "port", port)
	return nil
}

func (b *NFTablesBackend) SetupNFLOG(group uint16) error {
	b.logger.Info("nftables-stub: NFLOG setup skipped (non-Linux)", "group", group)
	return nil
}
