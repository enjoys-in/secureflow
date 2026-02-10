//go:build linux

package firewall

import (
	"encoding/binary"
	"fmt"
	"net"

	"github.com/google/nftables"
	"github.com/google/nftables/expr"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// Table and chain names managed by this backend.
const (
	nftTableName   = "firewall_manager"
	nftInputChain  = "fm_input"
	nftOutputChain = "fm_output"
)

// Protocol numbers (IANA).
const (
	protoTCP  = 6  // IPPROTO_TCP
	protoUDP  = 17 // IPPROTO_UDP
	protoICMP = 1  // IPPROTO_ICMP
)

// Reject type constants from the kernel (linux/netfilter/nf_tables.h).
const (
	nftRejectICMPUnreach = 0 // NFT_REJECT_ICMP_UNREACH
	nftRejectTCPRst      = 1 // NFT_REJECT_TCP_RST
	icmpPortUnreach      = 3 // ICMP destination port unreachable
)

// nftRuleEntry tracks an nftables kernel rule alongside our logical Rule.
type nftRuleEntry struct {
	fwRule  Rule           // our application-level rule
	nftRule *nftables.Rule // kernel rule (Handle populated after Flush)
	chain   *nftables.Chain
}

// NFTablesBackend implements the Backend interface using the nftables netlink
// API via github.com/google/nftables. This is a direct kernel interface —
// no userspace binary (nft, iptables) is involved.
//
// Architecture:
//
//	Go code ──► google/nftables ──► AF_NETLINK(NETLINK_NETFILTER) ──► kernel nf_tables
//
// On initialisation, a dedicated table "firewall_manager" is created with two
// base chains hooked into INPUT and OUTPUT at filter priority. All managed
// rules live in these chains.
type NFTablesBackend struct {
	logger   *logger.Logger
	conn     *nftables.Conn
	table    *nftables.Table
	inChain  *nftables.Chain
	outChain *nftables.Chain
	rules    map[string]*nftRuleEntry // keyed by our rule ID
}

// NewNFTablesBackend opens a netlink socket to the kernel's nf_tables
// subsystem and creates the managed table and chains.
func NewNFTablesBackend(log *logger.Logger) (*NFTablesBackend, error) {
	conn, err := nftables.New()
	if err != nil {
		return nil, fmt.Errorf("nftables: open netlink socket: %w", err)
	}

	// Clean up any stale table from a previous run (ignore errors).
	conn.DelTable(&nftables.Table{
		Family: nftables.TableFamilyIPv4,
		Name:   nftTableName,
	})
	_ = conn.Flush()

	// Create our table.
	table := conn.AddTable(&nftables.Table{
		Family: nftables.TableFamilyIPv4,
		Name:   nftTableName,
	})

	// Create INPUT filter chain.
	inChain := conn.AddChain(&nftables.Chain{
		Name:     nftInputChain,
		Table:    table,
		Type:     nftables.ChainTypeFilter,
		Hooknum:  nftables.ChainHookInput,
		Priority: nftables.ChainPriorityFilter,
	})

	// Create OUTPUT filter chain.
	outChain := conn.AddChain(&nftables.Chain{
		Name:     nftOutputChain,
		Table:    table,
		Type:     nftables.ChainTypeFilter,
		Hooknum:  nftables.ChainHookOutput,
		Priority: nftables.ChainPriorityFilter,
	})

	// Commit table + chains to kernel as an atomic batch.
	if err := conn.Flush(); err != nil {
		return nil, fmt.Errorf("nftables: flush initial setup: %w", err)
	}

	log.Info("nftables: backend ready (direct netlink syscall)",
		"table", nftTableName,
		"input_chain", nftInputChain,
		"output_chain", nftOutputChain,
	)

	return &NFTablesBackend{
		logger:   log,
		conn:     conn,
		table:    table,
		inChain:  inChain,
		outChain: outChain,
		rules:    make(map[string]*nftRuleEntry),
	}, nil
}

// ---------- Backend interface ----------

// ListRules returns all managed rules.
func (b *NFTablesBackend) ListRules() ([]Rule, error) {
	out := make([]Rule, 0, len(b.rules))
	for _, entry := range b.rules {
		out = append(out, entry.fwRule)
	}
	return out, nil
}

// AddRule builds nftables expressions for the given rule and sends them
// to the kernel via a netlink batch.
func (b *NFTablesBackend) AddRule(rule Rule) error {
	chain := b.chainFor(rule.Direction)
	exprs := b.buildExprs(rule)

	nftRule := b.conn.AddRule(&nftables.Rule{
		Table:    b.table,
		Chain:    chain,
		Exprs:    exprs,
		UserData: []byte(rule.ID), // tag for identification
	})

	// Flush sends the netlink batch; on success the rule Handle is populated
	// from the kernel echo reply.
	if err := b.conn.Flush(); err != nil {
		return fmt.Errorf("nftables: add rule: %w", err)
	}

	b.rules[rule.ID] = &nftRuleEntry{
		fwRule:  rule,
		nftRule: nftRule,
		chain:   chain,
	}

	b.logger.Info("nftables: rule added via netlink",
		"rule_id", rule.ID,
		"handle", nftRule.Handle,
		"port", rule.Port,
		"protocol", rule.Protocol,
		"action", rule.Action,
	)
	return nil
}

// DeleteRule removes a rule from the kernel using its handle.
func (b *NFTablesBackend) DeleteRule(id string) error {
	entry, ok := b.rules[id]
	if !ok {
		return fmt.Errorf("nftables: rule %s not found in tracker", id)
	}

	// Try handle-based deletion first (fastest path).
	if entry.nftRule.Handle != 0 {
		if err := b.conn.DelRule(entry.nftRule); err != nil {
			return fmt.Errorf("nftables: del rule by handle: %w", err)
		}
	} else {
		// Fallback: fetch rules from kernel and match by UserData.
		if err := b.deleteByUserData(id, entry.chain); err != nil {
			return err
		}
	}

	if err := b.conn.Flush(); err != nil {
		// Rule may have been removed externally; log and continue.
		b.logger.Warn("nftables: kernel flush for delete failed",
			"rule_id", id, "error", err,
		)
	}

	delete(b.rules, id)
	b.logger.Info("nftables: rule deleted via netlink", "rule_id", id)
	return nil
}

// Flush removes all rules from the managed chains.
func (b *NFTablesBackend) Flush() error {
	b.conn.FlushChain(b.inChain)
	b.conn.FlushChain(b.outChain)

	if err := b.conn.Flush(); err != nil {
		return fmt.Errorf("nftables: flush chains: %w", err)
	}

	b.rules = make(map[string]*nftRuleEntry)
	b.logger.Info("nftables: all managed rules flushed via netlink")
	return nil
}

// EnsurePort makes sure a specific port is open (ACCEPT) in the input chain.
func (b *NFTablesBackend) EnsurePort(port int, protocol, action string) error {
	ruleID := fmt.Sprintf("immutable-%s-%d", protocol, port)
	if _, ok := b.rules[ruleID]; ok {
		return nil
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

// ---------- Internal helpers ----------

// chainFor returns the nftables chain for the given direction.
func (b *NFTablesBackend) chainFor(direction string) *nftables.Chain {
	if direction == "outbound" {
		return b.outChain
	}
	return b.inChain
}

// deleteByUserData fetches rules from the kernel channel and deletes the one
// whose UserData matches the given ID. Used as a fallback when Handle is 0.
func (b *NFTablesBackend) deleteByUserData(id string, chain *nftables.Chain) error {
	kernelRules, err := b.conn.GetRules(b.table, chain)
	if err != nil {
		return fmt.Errorf("nftables: get rules for fallback delete: %w", err)
	}
	for _, kr := range kernelRules {
		if string(kr.UserData) == id {
			if err := b.conn.DelRule(kr); err != nil {
				return fmt.Errorf("nftables: del rule by userdata: %w", err)
			}
			return nil
		}
	}
	b.logger.Warn("nftables: rule not found in kernel, cleaning tracker", "rule_id", id)
	return nil
}

// buildExprs constructs the nftables expression list for a firewall rule.
//
// The expression pipeline mirrors what `nft add rule` does internally:
//
//  1. Match L4 protocol (meta l4proto)
//  2. Match destination port (payload transport header offset 2)
//  3. Match source CIDR (payload network header offset 12 + bitwise mask)
//  4. Match destination CIDR (payload network header offset 16 + bitwise mask)
//  5. Terminal action (verdict ACCEPT/DROP or reject expression)
func (b *NFTablesBackend) buildExprs(rule Rule) []expr.Any {
	var exprs []expr.Any

	// 1. Protocol match
	if rule.Protocol != "" && rule.Protocol != "all" {
		proto := protocolNumber(rule.Protocol)
		if proto != 0 {
			exprs = append(exprs,
				// meta load l4proto => reg 1
				&expr.Meta{Key: expr.MetaKeyL4PROTO, Register: 1},
				// cmp eq reg 1 <proto>
				&expr.Cmp{
					Op:       expr.CmpOpEq,
					Register: 1,
					Data:     []byte{proto},
				},
			)
		}
	}

	// 2. Destination port match (TCP / UDP only)
	if rule.Port > 0 && (rule.Protocol == "tcp" || rule.Protocol == "udp") {
		// payload load 2b @ transport header + 2 => reg 1
		exprs = append(exprs, &expr.Payload{
			DestRegister: 1,
			Base:         expr.PayloadBaseTransportHeader,
			Offset:       2, // destination port offset in TCP/UDP header
			Len:          2,
		})

		if rule.PortEnd > 0 && rule.PortEnd > rule.Port {
			// Port range: reg1 >= start AND reg1 <= end
			exprs = append(exprs,
				&expr.Cmp{
					Op:       expr.CmpOpGte,
					Register: 1,
					Data:     uint16BE(uint16(rule.Port)),
				},
				&expr.Cmp{
					Op:       expr.CmpOpLte,
					Register: 1,
					Data:     uint16BE(uint16(rule.PortEnd)),
				},
			)
		} else {
			// Single port
			exprs = append(exprs, &expr.Cmp{
				Op:       expr.CmpOpEq,
				Register: 1,
				Data:     uint16BE(uint16(rule.Port)),
			})
		}
	}

	// 3. Source CIDR match
	if cidrExprs := cidrMatchExprs(rule.SourceCIDR, 12); cidrExprs != nil {
		exprs = append(exprs, cidrExprs...)
	}

	// 4. Destination CIDR match
	if cidrExprs := cidrMatchExprs(rule.DestCIDR, 16); cidrExprs != nil {
		exprs = append(exprs, cidrExprs...)
	}

	// 5. Terminal action
	exprs = append(exprs, actionExprs(rule.Action, rule.Protocol)...)

	return exprs
}

// cidrMatchExprs builds payload + bitwise + cmp expressions for an IPv4 CIDR.
// offset is 12 for source IP, 16 for destination IP in the IPv4 header.
func cidrMatchExprs(cidr string, offset uint32) []expr.Any {
	if cidr == "" || cidr == "0.0.0.0/0" {
		return nil
	}

	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		// Try as bare IP → /32
		ip = net.ParseIP(cidr)
		if ip == nil {
			return nil
		}
		ipNet = &net.IPNet{
			IP:   ip,
			Mask: net.CIDRMask(32, 32),
		}
	}

	ip4 := ip.Mask(ipNet.Mask).To4()
	if ip4 == nil {
		return nil
	}

	return []expr.Any{
		// payload load 4b @ network header + offset => reg 1
		&expr.Payload{
			DestRegister: 1,
			Base:         expr.PayloadBaseNetworkHeader,
			Offset:       offset,
			Len:          4,
		},
		// bitwise reg1 = (reg1 & mask) ^ 0
		&expr.Bitwise{
			SourceRegister: 1,
			DestRegister:   1,
			Len:            4,
			Mask:           []byte(ipNet.Mask),
			Xor:            []byte{0, 0, 0, 0},
		},
		// cmp eq reg1 <network address>
		&expr.Cmp{
			Op:       expr.CmpOpEq,
			Register: 1,
			Data:     ip4,
		},
	}
}

// actionExprs returns the terminal expression(s) for a firewall action.
func actionExprs(action, protocol string) []expr.Any {
	switch action {
	case "ACCEPT":
		return []expr.Any{&expr.Verdict{Kind: expr.VerdictAccept}}
	case "DROP":
		return []expr.Any{&expr.Verdict{Kind: expr.VerdictDrop}}
	case "REJECT":
		// TCP connections get a RST; everything else gets ICMP port-unreachable.
		if protocol == "tcp" {
			return []expr.Any{&expr.Reject{
				Type: nftRejectTCPRst,
				Code: 0,
			}}
		}
		return []expr.Any{&expr.Reject{
			Type: nftRejectICMPUnreach,
			Code: icmpPortUnreach,
		}}
	default:
		return []expr.Any{&expr.Verdict{Kind: expr.VerdictDrop}}
	}
}

// protocolNumber maps a protocol name to its IANA number.
func protocolNumber(proto string) byte {
	switch proto {
	case "tcp":
		return protoTCP
	case "udp":
		return protoUDP
	case "icmp":
		return protoICMP
	default:
		return 0
	}
}

// uint16BE encodes a uint16 in network byte order (big-endian).
func uint16BE(v uint16) []byte {
	b := make([]byte, 2)
	binary.BigEndian.PutUint16(b, v)
	return b
}

// SetupNFLOG installs NFLOG rules in the nftables chains so that
// the kernel copies packet metadata to userspace via netlink.
func (b *NFTablesBackend) SetupNFLOG(group uint16) error {
	// Add a log rule at the start of the input chain.
	b.conn.AddRule(&nftables.Rule{
		Table: b.table,
		Chain: b.inChain,
		Exprs: []expr.Any{
			&expr.Log{
				Group:   group,
				Snaplen: 128,
			},
		},
	})

	// Add a log rule at the start of the output chain.
	b.conn.AddRule(&nftables.Rule{
		Table: b.table,
		Chain: b.outChain,
		Exprs: []expr.Any{
			&expr.Log{
				Group:   group,
				Snaplen: 128,
			},
		},
	})

	if err := b.conn.Flush(); err != nil {
		return fmt.Errorf("nftables: flush NFLOG rules: %w", err)
	}

	b.logger.Info("nftables: NFLOG rules installed", "group", group)
	return nil
}

// Ensure compile-time interface compliance.
var _ Backend = (*NFTablesBackend)(nil)
