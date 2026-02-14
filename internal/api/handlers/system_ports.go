package handlers

import (
	"bufio"
	"encoding/hex"
	"fmt"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// ListeningPort represents a port currently listening on the system.
type ListeningPort struct {
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
	Address  string `json:"address"`
	PID      int    `json:"pid,omitempty"`
	Process  string `json:"process,omitempty"`
	State    string `json:"state"`
}

// SystemPortsHandler handles system port discovery.
type SystemPortsHandler struct{}

// NewSystemPortsHandler creates a new system ports handler.
func NewSystemPortsHandler() *SystemPortsHandler {
	return &SystemPortsHandler{}
}

// ListListeningPorts returns all ports currently listening on the system.
func (h *SystemPortsHandler) ListListeningPorts(c *fiber.Ctx) error {
	var ports []ListeningPort
	var err error

	if runtime.GOOS == "linux" {
		ports, err = getLinuxListeningPorts()
	} else if runtime.GOOS == "windows" {
		ports, err = getWindowsListeningPorts()
	} else {
		ports, err = getGenericListeningPorts()
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to get listening ports",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"listening_ports": ports,
		"os":              runtime.GOOS,
	})
}

// getLinuxListeningPorts reads from /proc/net/tcp and /proc/net/udp.
func getLinuxListeningPorts() ([]ListeningPort, error) {
	var ports []ListeningPort

	// Try ss command first (more reliable)
	if out, err := exec.Command("ss", "-tlnp").Output(); err == nil {
		ports = append(ports, parseSS(string(out), "tcp")...)
	} else {
		// Fallback to /proc/net/tcp
		tcpPorts, err := parseProcNet("/proc/net/tcp", "tcp")
		if err == nil {
			ports = append(ports, tcpPorts...)
		}
	}

	if out, err := exec.Command("ss", "-ulnp").Output(); err == nil {
		ports = append(ports, parseSS(string(out), "udp")...)
	} else {
		udpPorts, err := parseProcNet("/proc/net/udp", "udp")
		if err == nil {
			ports = append(ports, udpPorts...)
		}
	}

	return deduplicatePorts(ports), nil
}

// getWindowsListeningPorts uses netstat on Windows.
func getWindowsListeningPorts() ([]ListeningPort, error) {
	out, err := exec.Command("netstat", "-ano", "-p", "TCP").Output()
	if err != nil {
		return nil, fmt.Errorf("netstat failed: %w", err)
	}

	var ports []ListeningPort
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.Contains(line, "LISTENING") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}

		proto := strings.ToLower(fields[0])
		localAddr := fields[1]
		lastColon := strings.LastIndex(localAddr, ":")
		if lastColon < 0 {
			continue
		}
		addr := localAddr[:lastColon]
		portStr := localAddr[lastColon+1:]
		port, err := strconv.Atoi(portStr)
		if err != nil {
			continue
		}

		pid, _ := strconv.Atoi(fields[len(fields)-1])

		processName := ""
		if pid > 0 {
			if nameOut, err := exec.Command("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid), "/FO", "CSV", "/NH").Output(); err == nil {
				csvLine := strings.TrimSpace(string(nameOut))
				if parts := strings.SplitN(csvLine, ",", 2); len(parts) > 0 {
					processName = strings.Trim(parts[0], "\"")
				}
			}
		}

		ports = append(ports, ListeningPort{
			Port:     port,
			Protocol: proto,
			Address:  addr,
			PID:      pid,
			Process:  processName,
			State:    "LISTEN",
		})
	}

	// Also get UDP
	outUDP, err := exec.Command("netstat", "-ano", "-p", "UDP").Output()
	if err == nil {
		linesUDP := strings.Split(string(outUDP), "\n")
		for _, line := range linesUDP {
			line = strings.TrimSpace(line)
			fields := strings.Fields(line)
			if len(fields) < 4 || strings.ToLower(fields[0]) != "udp" {
				continue
			}

			localAddr := fields[1]
			lastColon := strings.LastIndex(localAddr, ":")
			if lastColon < 0 {
				continue
			}
			portStr := localAddr[lastColon+1:]
			port, err := strconv.Atoi(portStr)
			if err != nil || port == 0 {
				continue
			}
			addr := localAddr[:lastColon]
			pid, _ := strconv.Atoi(fields[len(fields)-1])

			ports = append(ports, ListeningPort{
				Port:     port,
				Protocol: "udp",
				Address:  addr,
				PID:      pid,
				State:    "LISTEN",
			})
		}
	}

	return deduplicatePorts(ports), nil
}

// getGenericListeningPorts is a fallback using netstat.
func getGenericListeningPorts() ([]ListeningPort, error) {
	out, err := exec.Command("netstat", "-tln").Output()
	if err != nil {
		return nil, fmt.Errorf("netstat failed: %w", err)
	}

	var ports []ListeningPort
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.Contains(line, "LISTEN") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		localAddr := fields[3]
		lastColon := strings.LastIndex(localAddr, ":")
		if lastColon < 0 {
			continue
		}
		portStr := localAddr[lastColon+1:]
		port, err := strconv.Atoi(portStr)
		if err != nil {
			continue
		}

		ports = append(ports, ListeningPort{
			Port:     port,
			Protocol: strings.ToLower(fields[0]),
			Address:  localAddr[:lastColon],
			State:    "LISTEN",
		})
	}

	return deduplicatePorts(ports), nil
}

// parseSS parses output from the ss command.
func parseSS(output, proto string) []ListeningPort {
	var ports []ListeningPort
	lines := strings.Split(output, "\n")
	for _, line := range lines[1:] { // skip header
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}

		localAddr := fields[3]
		lastColon := strings.LastIndex(localAddr, ":")
		if lastColon < 0 {
			continue
		}
		addr := localAddr[:lastColon]
		portStr := localAddr[lastColon+1:]
		port, err := strconv.Atoi(portStr)
		if err != nil || port == 0 {
			continue
		}

		processName := ""
		pid := 0
		// Parse process info from ss output: users:(("process",pid=123,fd=4))
		for _, f := range fields {
			if strings.HasPrefix(f, "users:") {
				if idx := strings.Index(f, "((\""); idx >= 0 {
					rest := f[idx+3:]
					if end := strings.Index(rest, "\""); end >= 0 {
						processName = rest[:end]
					}
				}
				if idx := strings.Index(f, "pid="); idx >= 0 {
					rest := f[idx+4:]
					if end := strings.IndexAny(rest, ",)"); end >= 0 {
						pid, _ = strconv.Atoi(rest[:end])
					}
				}
			}
		}

		ports = append(ports, ListeningPort{
			Port:     port,
			Protocol: proto,
			Address:  addr,
			PID:      pid,
			Process:  processName,
			State:    "LISTEN",
		})
	}
	return ports
}

// parseProcNet reads /proc/net/tcp or /proc/net/udp.
func parseProcNet(path, proto string) ([]ListeningPort, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var ports []ListeningPort
	scanner := bufio.NewScanner(file)
	scanner.Scan() // skip header

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}

		// State: 0A = LISTEN
		state := fields[3]
		if proto == "tcp" && state != "0A" {
			continue
		}

		localAddr := fields[1]
		parts := strings.Split(localAddr, ":")
		if len(parts) != 2 {
			continue
		}

		portHex := parts[1]
		port64, err := strconv.ParseInt(portHex, 16, 32)
		if err != nil || port64 == 0 {
			continue
		}

		addrHex := parts[0]
		addr := hexToIP(addrHex)

		ports = append(ports, ListeningPort{
			Port:     int(port64),
			Protocol: proto,
			Address:  addr,
			State:    "LISTEN",
		})
	}

	return ports, scanner.Err()
}

// hexToIP converts a hex-encoded IP address from /proc/net to dotted notation.
func hexToIP(hexStr string) string {
	if len(hexStr) != 8 {
		return hexStr
	}
	b, err := hex.DecodeString(hexStr)
	if err != nil || len(b) != 4 {
		return hexStr
	}
	// /proc/net stores IPs in little-endian
	return net.IPv4(b[3], b[2], b[1], b[0]).String()
}

// deduplicatePorts removes duplicate port+protocol combinations.
func deduplicatePorts(ports []ListeningPort) []ListeningPort {
	seen := make(map[string]bool)
	var result []ListeningPort
	for _, p := range ports {
		key := fmt.Sprintf("%d-%s", p.Port, p.Protocol)
		if !seen[key] {
			seen[key] = true
			result = append(result, p)
		}
	}
	return result
}
