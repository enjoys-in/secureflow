package firewall

import (
	"fmt"
	"sync"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// Rule represents a firewall rule for the syscall layer.
type Rule struct {
	ID         string `json:"id"`
	Direction  string `json:"direction"` // "inbound" or "outbound"
	Protocol   string `json:"protocol"`  // "tcp", "udp", "icmp", "all"
	Port       int    `json:"port"`
	PortEnd    int    `json:"port_end"` // 0 = single port
	SourceCIDR string `json:"source_cidr"`
	DestCIDR   string `json:"dest_cidr"`
	Action     string `json:"action"` // "ACCEPT", "DROP", "REJECT"
}

// FirewallManager defines the interface for firewall operations.
type FirewallManager interface {
	ListRules() ([]Rule, error)
	AddRule(rule Rule) error
	DeleteRule(id string) error
	ApplyRules(rules []Rule) error
	EnsureImmutablePorts() error
	IsPortImmutable(port int) bool
	Flush() error
}

// Backend is the low-level firewall backend (iptables or nftables).
type Backend interface {
	ListRules() ([]Rule, error)
	AddRule(rule Rule) error
	DeleteRule(id string) error
	Flush() error
	EnsurePort(port int, protocol, action string) error
	// SetupNFLOG installs NFLOG rules so the kernel sends packet metadata
	// to userspace (NFLOG group 100) for live traffic monitoring.
	SetupNFLOG(group uint16) error
}

// Manager is the concrete implementation with concurrency safety.
type Manager struct {
	backend        Backend
	immutablePorts []int
	mu             sync.Mutex
	logger         *logger.Logger
}

// NewManager creates a new firewall manager with the specified backend.
func NewManager(backendType string, immutablePorts []int, log *logger.Logger) (*Manager, error) {
	var backend Backend
	var err error

	switch backendType {
	case "iptables":
		backend, err = NewIPTablesBackend(log)
	case "nftables":
		backend, err = NewNFTablesBackend(log)
	default:
		return nil, fmt.Errorf("unsupported firewall backend: %s", backendType)
	}

	if err != nil {
		return nil, fmt.Errorf("init backend %s: %w", backendType, err)
	}

	return &Manager{
		backend:        backend,
		immutablePorts: immutablePorts,
		logger:         log,
	}, nil
}

// IsPortImmutable checks if a port is in the immutable list.
func (m *Manager) IsPortImmutable(port int) bool {
	for _, p := range m.immutablePorts {
		if p == port {
			return true
		}
	}
	return false
}

// EnsureImmutablePorts opens all immutable ports (called on startup).
func (m *Manager) EnsureImmutablePorts() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, port := range m.immutablePorts {
		if err := m.backend.EnsurePort(port, "tcp", "ACCEPT"); err != nil {
			return fmt.Errorf("ensure port %d: %w", port, err)
		}
		m.logger.Info("Immutable port ensured", "port", port)
	}
	return nil
}

// ListRules returns all current firewall rules.
func (m *Manager) ListRules() ([]Rule, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.backend.ListRules()
}

// AddRule adds a single firewall rule after validation.
func (m *Manager) AddRule(rule Rule) error {
	// Block attempts to DROP/REJECT immutable ports
	if (rule.Action == "DROP" || rule.Action == "REJECT") && m.IsPortImmutable(rule.Port) {
		return fmt.Errorf("port %d is immutable and cannot be blocked", rule.Port)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.backend.AddRule(rule); err != nil {
		return fmt.Errorf("add rule: %w", err)
	}

	m.logger.Info("Rule added", "rule_id", rule.ID, "port", rule.Port, "action", rule.Action)
	return nil
}

// DeleteRule removes a firewall rule (immutable rules cannot be deleted).
func (m *Manager) DeleteRule(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.backend.DeleteRule(id); err != nil {
		return fmt.Errorf("delete rule %s: %w", id, err)
	}

	m.logger.Info("Rule deleted", "rule_id", id)

	// Re-ensure immutable ports after any delete
	for _, port := range m.immutablePorts {
		_ = m.backend.EnsurePort(port, "tcp", "ACCEPT")
	}

	return nil
}

// ApplyRules applies a batch of rules atomically (for security group application).
func (m *Manager) ApplyRules(rules []Rule) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Validate all rules first
	for _, rule := range rules {
		if (rule.Action == "DROP" || rule.Action == "REJECT") && m.IsPortImmutable(rule.Port) {
			return fmt.Errorf("cannot apply rules: port %d is immutable", rule.Port)
		}
	}

	// Apply rules one by one; rollback on failure
	var applied []Rule
	for _, rule := range rules {
		if err := m.backend.AddRule(rule); err != nil {
			m.logger.Error("Rule apply failed, rolling back", "error", err)
			for _, r := range applied {
				_ = m.backend.DeleteRule(r.ID)
			}
			return fmt.Errorf("apply rules failed at rule %s: %w", rule.ID, err)
		}
		applied = append(applied, rule)
	}

	// Always re-ensure immutable ports
	for _, port := range m.immutablePorts {
		_ = m.backend.EnsurePort(port, "tcp", "ACCEPT")
	}

	m.logger.Info("Rules applied", "count", len(rules))
	return nil
}

// Flush removes all non-immutable rules.
func (m *Manager) Flush() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.backend.Flush(); err != nil {
		return err
	}

	// Re-ensure immutable ports after flush
	for _, port := range m.immutablePorts {
		_ = m.backend.EnsurePort(port, "tcp", "ACCEPT")
	}

	return nil
}

// AddImmutablePort adds a port to the immutable list and ensures it's open.
func (m *Manager) AddImmutablePort(port int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if already present
	for _, p := range m.immutablePorts {
		if p == port {
			return nil // already immutable
		}
	}

	m.immutablePorts = append(m.immutablePorts, port)

	if err := m.backend.EnsurePort(port, "tcp", "ACCEPT"); err != nil {
		return fmt.Errorf("ensure new immutable port %d: %w", port, err)
	}

	m.logger.Info("Immutable port added", "port", port)
	return nil
}

// RemoveImmutablePort removes a port from the in-memory immutable list.
// The caller must verify the port is not a default port before calling this.
func (m *Manager) RemoveImmutablePort(port int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	filtered := m.immutablePorts[:0]
	for _, p := range m.immutablePorts {
		if p != port {
			filtered = append(filtered, p)
		}
	}
	m.immutablePorts = filtered
	m.logger.Info("Immutable port removed from runtime list", "port", port)
}

// SetupTrafficMonitoring installs NFLOG rules in the kernel so that
// incoming and outgoing packets are sent to userspace for live monitoring.
func (m *Manager) SetupTrafficMonitoring(nflogGroup uint16) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.backend.SetupNFLOG(nflogGroup); err != nil {
		return fmt.Errorf("setup NFLOG: %w", err)
	}

	m.logger.Info("Traffic monitoring NFLOG rules installed", "group", nflogGroup)
	return nil
}
