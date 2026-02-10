package firewall

import (
	"fmt"
	"net"
	"strings"
)

// ValidateProtocol checks if a protocol is valid.
func ValidateProtocol(proto string) error {
	valid := map[string]bool{"tcp": true, "udp": true, "icmp": true, "all": true}
	if !valid[strings.ToLower(proto)] {
		return fmt.Errorf("invalid protocol: %s (must be tcp, udp, icmp, or all)", proto)
	}
	return nil
}

// ValidatePort checks if a port number is valid.
func ValidatePort(port int) error {
	if port < 0 || port > 65535 {
		return fmt.Errorf("invalid port: %d (must be 0-65535)", port)
	}
	return nil
}

// ValidatePortRange checks if a port range is valid.
func ValidatePortRange(start, end int) error {
	if err := ValidatePort(start); err != nil {
		return err
	}
	if end > 0 {
		if err := ValidatePort(end); err != nil {
			return err
		}
		if end <= start {
			return fmt.Errorf("port range end (%d) must be greater than start (%d)", end, start)
		}
	}
	return nil
}

// ValidateCIDR checks if a CIDR notation is valid.
func ValidateCIDR(cidr string) error {
	if cidr == "" {
		return nil
	}
	_, _, err := net.ParseCIDR(cidr)
	if err != nil {
		// Try as a plain IP
		if ip := net.ParseIP(cidr); ip == nil {
			return fmt.Errorf("invalid CIDR or IP: %s", cidr)
		}
	}
	return nil
}

// ValidateAction checks if a firewall action is valid.
func ValidateAction(action string) error {
	valid := map[string]bool{"ACCEPT": true, "DROP": true, "REJECT": true}
	if !valid[strings.ToUpper(action)] {
		return fmt.Errorf("invalid action: %s (must be ACCEPT, DROP, or REJECT)", action)
	}
	return nil
}

// ValidateDirection checks if a rule direction is valid.
func ValidateDirection(dir string) error {
	valid := map[string]bool{"inbound": true, "outbound": true}
	if !valid[strings.ToLower(dir)] {
		return fmt.Errorf("invalid direction: %s (must be inbound or outbound)", dir)
	}
	return nil
}

// ValidateRule performs complete validation of a firewall rule.
func ValidateRule(rule Rule) error {
	if err := ValidateDirection(rule.Direction); err != nil {
		return err
	}
	if err := ValidateProtocol(rule.Protocol); err != nil {
		return err
	}
	if err := ValidatePortRange(rule.Port, rule.PortEnd); err != nil {
		return err
	}
	if err := ValidateCIDR(rule.SourceCIDR); err != nil {
		return err
	}
	if err := ValidateCIDR(rule.DestCIDR); err != nil {
		return err
	}
	if err := ValidateAction(rule.Action); err != nil {
		return err
	}
	return nil
}
