package utils

import (
	"fmt"
	"net"
	"regexp"
	"strings"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// ValidateEmail checks if an email address is valid.
func ValidateEmail(email string) error {
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email: %s", email)
	}
	return nil
}

// ValidateIP checks if an IP address is valid.
func ValidateIP(ip string) error {
	if net.ParseIP(ip) == nil {
		return fmt.Errorf("invalid IP address: %s", ip)
	}
	return nil
}

// ValidateCIDR checks if a CIDR notation is valid.
func ValidateCIDR(cidr string) error {
	_, _, err := net.ParseCIDR(cidr)
	return err
}

// NormalizeCIDR ensures an IP has CIDR notation (/32 for IPv4, /128 for IPv6).
func NormalizeCIDR(input string) string {
	if strings.Contains(input, "/") {
		return input
	}
	if ip := net.ParseIP(input); ip != nil {
		if ip.To4() != nil {
			return input + "/32"
		}
		return input + "/128"
	}
	return input
}

// IPInCIDR checks if an IP address is within a CIDR range.
func IPInCIDR(ip, cidr string) (bool, error) {
	_, network, err := net.ParseCIDR(cidr)
	if err != nil {
		return false, err
	}
	return network.Contains(net.ParseIP(ip)), nil
}

// SubnetMaskToPrefix converts a subnet mask to CIDR prefix length.
func SubnetMaskToPrefix(mask string) (int, error) {
	ip := net.ParseIP(mask)
	if ip == nil {
		return 0, fmt.Errorf("invalid subnet mask: %s", mask)
	}
	ipMask := net.IPMask(ip.To4())
	prefix, _ := ipMask.Size()
	return prefix, nil
}
