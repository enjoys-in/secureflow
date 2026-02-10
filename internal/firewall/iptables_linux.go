//go:build linux

package firewall

import (
	"fmt"
	"strconv"

	"github.com/coreos/go-iptables/iptables"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// Custom chain names in the filter table.
// All managed rules are placed in these chains to avoid polluting
// the built-in INPUT / OUTPUT chains.
const (
	iptFilterTable = "filter"
	iptInputChain  = "FM_INPUT"
	iptOutputChain = "FM_OUTPUT"
	iptCommentTag  = "fm:" // prefix used in --comment to tag rules
)

// IPTablesBackend implements the Backend interface via the iptables userspace
// binary (which communicates with the kernel's netfilter/xtables subsystem
// through a netlink socket internally).
//
// Architecture:
//
//	Go code ──► go-iptables ──► /sbin/iptables ──► AF_NETLINK(NETLINK_NETFILTER) ──► kernel nf_tables
//
// Rules are appended into dedicated custom chains (FM_INPUT / FM_OUTPUT).
// Jump rules from the built-in INPUT/OUTPUT chains route traffic through
// our chains first.
type IPTablesBackend struct {
	logger *logger.Logger
	ipt    *iptables.IPTables
	rules  map[string]Rule // track managed rules by ID
}

// NewIPTablesBackend creates and initialises the iptables backend.
// It creates custom chains and inserts jump rules from INPUT/OUTPUT.
func NewIPTablesBackend(log *logger.Logger) (*IPTablesBackend, error) {
	ipt, err := iptables.NewWithProtocol(iptables.ProtocolIPv4)
	if err != nil {
		return nil, fmt.Errorf("iptables: failed to initialise: %w", err)
	}

	// Create custom chains if they don't exist
	for _, chain := range []string{iptInputChain, iptOutputChain} {
		ok, err := ipt.ChainExists(iptFilterTable, chain)
		if err != nil {
			return nil, fmt.Errorf("iptables: check chain %s: %w", chain, err)
		}
		if !ok {
			if err := ipt.NewChain(iptFilterTable, chain); err != nil {
				return nil, fmt.Errorf("iptables: create chain %s: %w", chain, err)
			}
			log.Info("iptables: created custom chain", "chain", chain)
		}
	}

	// Insert jump from INPUT → FM_INPUT (idempotent)
	jumpIn := []string{"-j", iptInputChain}
	if ok, _ := ipt.Exists(iptFilterTable, "INPUT", jumpIn...); !ok {
		if err := ipt.Insert(iptFilterTable, "INPUT", 1, jumpIn...); err != nil {
			return nil, fmt.Errorf("iptables: insert INPUT jump: %w", err)
		}
	}

	// Insert jump from OUTPUT → FM_OUTPUT (idempotent)
	jumpOut := []string{"-j", iptOutputChain}
	if ok, _ := ipt.Exists(iptFilterTable, "OUTPUT", jumpOut...); !ok {
		if err := ipt.Insert(iptFilterTable, "OUTPUT", 1, jumpOut...); err != nil {
			return nil, fmt.Errorf("iptables: insert OUTPUT jump: %w", err)
		}
	}

	log.Info("iptables: backend ready (via go-iptables → netfilter netlink)",
		"table", iptFilterTable,
		"input_chain", iptInputChain,
		"output_chain", iptOutputChain,
	)

	return &IPTablesBackend{
		logger: log,
		ipt:    ipt,
		rules:  make(map[string]Rule),
	}, nil
}

// chainFor returns the custom chain name for the given direction.
func chainFor(direction string) string {
	if direction == "outbound" {
		return iptOutputChain
	}
	return iptInputChain
}

// ruleSpec builds the iptables argument list for a rule.
// Each rule is tagged with "-m comment --comment fm:<id>" so it can be
// unambiguously identified during deletion.
func ruleSpec(rule Rule) []string {
	var spec []string

	// Protocol
	if rule.Protocol != "" && rule.Protocol != "all" {
		spec = append(spec, "-p", rule.Protocol)
	}

	// Destination port (only meaningful for TCP / UDP)
	if rule.Port > 0 && (rule.Protocol == "tcp" || rule.Protocol == "udp") {
		if rule.PortEnd > 0 && rule.PortEnd > rule.Port {
			spec = append(spec, "--dport", fmt.Sprintf("%d:%d", rule.Port, rule.PortEnd))
		} else {
			spec = append(spec, "--dport", strconv.Itoa(rule.Port))
		}
	}

	// Source CIDR
	if rule.SourceCIDR != "" && rule.SourceCIDR != "0.0.0.0/0" {
		spec = append(spec, "-s", rule.SourceCIDR)
	}

	// Destination CIDR
	if rule.DestCIDR != "" && rule.DestCIDR != "0.0.0.0/0" {
		spec = append(spec, "-d", rule.DestCIDR)
	}

	// Comment tag for identification
	spec = append(spec, "-m", "comment", "--comment", iptCommentTag+rule.ID)

	// Target / action
	spec = append(spec, "-j", rule.Action)

	return spec
}

// ListRules returns all managed rules.
func (b *IPTablesBackend) ListRules() ([]Rule, error) {
	out := make([]Rule, 0, len(b.rules))
	for _, r := range b.rules {
		out = append(out, r)
	}
	return out, nil
}

// AddRule inserts a rule into the kernel via iptables.
func (b *IPTablesBackend) AddRule(rule Rule) error {
	chain := chainFor(rule.Direction)
	spec := ruleSpec(rule)

	if err := b.ipt.AppendUnique(iptFilterTable, chain, spec...); err != nil {
		return fmt.Errorf("iptables: add rule to %s: %w", chain, err)
	}

	b.rules[rule.ID] = rule
	b.logger.Info("iptables: rule added to kernel",
		"chain", chain,
		"rule_id", rule.ID,
		"port", rule.Port,
		"protocol", rule.Protocol,
		"action", rule.Action,
	)
	return nil
}

// DeleteRule removes a rule from the kernel via iptables.
func (b *IPTablesBackend) DeleteRule(id string) error {
	rule, ok := b.rules[id]
	if !ok {
		return fmt.Errorf("iptables: rule %s not found in tracker", id)
	}

	chain := chainFor(rule.Direction)
	spec := ruleSpec(rule)

	if err := b.ipt.Delete(iptFilterTable, chain, spec...); err != nil {
		b.logger.Warn("iptables: kernel delete failed, removing from tracker",
			"rule_id", id, "error", err,
		)
	}

	delete(b.rules, id)
	b.logger.Info("iptables: rule deleted", "chain", chain, "rule_id", id)
	return nil
}

// Flush clears all rules from the custom chains.
func (b *IPTablesBackend) Flush() error {
	if err := b.ipt.ClearChain(iptFilterTable, iptInputChain); err != nil {
		return fmt.Errorf("iptables: flush %s: %w", iptInputChain, err)
	}
	if err := b.ipt.ClearChain(iptFilterTable, iptOutputChain); err != nil {
		return fmt.Errorf("iptables: flush %s: %w", iptOutputChain, err)
	}

	b.rules = make(map[string]Rule)
	b.logger.Info("iptables: all managed rules flushed from kernel")
	return nil
}

// EnsurePort makes sure a specific port is open (ACCEPT) in the INPUT chain.
func (b *IPTablesBackend) EnsurePort(port int, protocol, action string) error {
	ruleID := fmt.Sprintf("immutable-%s-%d", protocol, port)
	if _, ok := b.rules[ruleID]; ok {
		return nil // already present
	}

	rule := Rule{
		ID:         ruleID,
		Direction:  "inbound",
		Protocol:   protocol,
		Port:       port,
		SourceCIDR: "0.0.0.0/0",
		Action:     action,
	}

	return b.AddRule(rule)
}

// SetupNFLOG installs NFLOG rules in the INPUT and OUTPUT chains so that
// the kernel copies packet metadata to userspace via netlink. This is used
// by the real-time traffic monitor.
func (b *IPTablesBackend) SetupNFLOG(group uint16) error {
	groupStr := strconv.Itoa(int(group))

	// NFLOG rule for INPUT chain — log all incoming packets.
	inputSpec := []string{"-j", "NFLOG", "--nflog-group", groupStr, "--nflog-prefix", "FM:INPUT:ACCEPT:"}
	if ok, _ := b.ipt.Exists(iptFilterTable, "INPUT", inputSpec...); !ok {
		if err := b.ipt.Insert(iptFilterTable, "INPUT", 1, inputSpec...); err != nil {
			return fmt.Errorf("iptables: insert NFLOG INPUT: %w", err)
		}
		b.logger.Info("iptables: NFLOG INPUT rule installed", "group", group)
	}

	// NFLOG rule for OUTPUT chain — log all outgoing packets.
	outputSpec := []string{"-j", "NFLOG", "--nflog-group", groupStr, "--nflog-prefix", "FM:OUTPUT:ACCEPT:"}
	if ok, _ := b.ipt.Exists(iptFilterTable, "OUTPUT", outputSpec...); !ok {
		if err := b.ipt.Insert(iptFilterTable, "OUTPUT", 1, outputSpec...); err != nil {
			return fmt.Errorf("iptables: insert NFLOG OUTPUT: %w", err)
		}
		b.logger.Info("iptables: NFLOG OUTPUT rule installed", "group", group)
	}

	// Also log packets that will be dropped by our managed chains.
	dropInputSpec := []string{"-j", "NFLOG", "--nflog-group", groupStr, "--nflog-prefix", "FM:INPUT:DROP:"}
	if ok, _ := b.ipt.Exists(iptFilterTable, iptInputChain, dropInputSpec...); !ok {
		if err := b.ipt.Insert(iptFilterTable, iptInputChain, 1, dropInputSpec...); err != nil {
			b.logger.Warn("iptables: could not insert NFLOG in managed chain", "error", err)
		}
	}

	return nil
}
