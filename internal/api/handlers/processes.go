package handlers

import (
	"fmt"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// ProcessInfo represents a running process on the system.
type ProcessInfo struct {
	PID            int     `json:"pid"`
	Name           string  `json:"name"`
	User           string  `json:"user"`
	CPUPercent     float64 `json:"cpu_percent"`
	MemoryPercent  float64 `json:"memory_percent"`
	MemoryRSS      int64   `json:"memory_rss_kb"`
	State          string  `json:"state"`
	ListeningPorts []int   `json:"listening_ports,omitempty"`
	Command        string  `json:"command"`
	StartTime      string  `json:"start_time"`
}

// ProcessHandler handles process listing.
type ProcessHandler struct{}

// NewProcessHandler creates a new process handler.
func NewProcessHandler() *ProcessHandler {
	return &ProcessHandler{}
}

// ListProcesses returns all currently running processes.
func (h *ProcessHandler) ListProcesses(c *fiber.Ctx) error {
	var processes []ProcessInfo
	var err error

	if runtime.GOOS == "linux" {
		processes, err = getLinuxProcesses()
	} else if runtime.GOOS == "windows" {
		processes, err = getWindowsProcesses()
	} else {
		processes, err = getGenericProcesses()
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to list processes",
			"details": err.Error(),
		})
	}

	// Enrich with listening ports
	portMap := buildPidToPortsMap()

	for i := range processes {
		if ports, ok := portMap[processes[i].PID]; ok {
			processes[i].ListeningPorts = ports
		}
	}

	return c.JSON(fiber.Map{
		"processes": processes,
		"total":     len(processes),
		"os":        runtime.GOOS,
	})
}

// getLinuxProcesses uses ps to get running processes.
func getLinuxProcesses() ([]ProcessInfo, error) {
	// ps aux output: USER PID %CPU %MEM RSS STAT START COMMAND
	out, err := exec.Command("ps", "aux", "--no-headers").Output()
	if err != nil {
		return nil, fmt.Errorf("ps command failed: %w", err)
	}

	var processes []ProcessInfo
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 11 {
			continue
		}

		pid, err := strconv.Atoi(fields[1])
		if err != nil {
			continue
		}
		cpu, _ := strconv.ParseFloat(fields[2], 64)
		mem, _ := strconv.ParseFloat(fields[3], 64)
		rss, _ := strconv.ParseInt(fields[5], 10, 64)
		state := fields[7]
		startTime := fields[8]
		command := strings.Join(fields[10:], " ")

		// Truncate long commands
		if len(command) > 200 {
			command = command[:200] + "..."
		}

		processes = append(processes, ProcessInfo{
			PID:           pid,
			Name:          extractProcessName(command),
			User:          fields[0],
			CPUPercent:    cpu,
			MemoryPercent: mem,
			MemoryRSS:     rss,
			State:         state,
			Command:       command,
			StartTime:     startTime,
		})
	}

	return processes, nil
}

// getWindowsProcesses uses tasklist and wmic to get process info.
func getWindowsProcesses() ([]ProcessInfo, error) {
	// Use wmic for detailed info
	out, err := exec.Command("wmic", "process", "get",
		"ProcessId,Name,WorkingSetSize,CommandLine,CreationDate", "/FORMAT:CSV").Output()
	if err != nil {
		// Fallback to tasklist
		return getWindowsTasklist()
	}

	var processes []ProcessInfo
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines[1:] { // skip header
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Split(line, ",")
		if len(fields) < 5 {
			continue
		}

		// CSV: Node, CommandLine, CreationDate, Name, ProcessId, WorkingSetSize
		// Order may vary, parse carefully
		pid, err := strconv.Atoi(strings.TrimSpace(fields[len(fields)-2]))
		if err != nil {
			continue
		}
		name := strings.TrimSpace(fields[len(fields)-3])
		wss, _ := strconv.ParseInt(strings.TrimSpace(fields[len(fields)-1]), 10, 64)
		rssKB := wss / 1024

		command := strings.TrimSpace(fields[1])
		if len(command) > 200 {
			command = command[:200] + "..."
		}

		processes = append(processes, ProcessInfo{
			PID:       pid,
			Name:      name,
			MemoryRSS: rssKB,
			Command:   command,
			State:     "Running",
		})
	}

	return processes, nil
}

// getWindowsTasklist is a simpler fallback.
func getWindowsTasklist() ([]ProcessInfo, error) {
	out, err := exec.Command("tasklist", "/FO", "CSV", "/NH", "/V").Output()
	if err != nil {
		return nil, fmt.Errorf("tasklist failed: %w", err)
	}

	var processes []ProcessInfo
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// CSV format: "Image Name","PID","Session Name","Session#","Mem Usage","Status","User Name","CPU Time","Window Title"
		parts := parseCSVLine(line)
		if len(parts) < 7 {
			continue
		}

		pid, err := strconv.Atoi(parts[1])
		if err != nil {
			continue
		}

		memStr := strings.ReplaceAll(parts[4], ",", "")
		memStr = strings.ReplaceAll(memStr, " K", "")
		memStr = strings.ReplaceAll(memStr, " ", "")
		mem, _ := strconv.ParseInt(memStr, 10, 64)

		processes = append(processes, ProcessInfo{
			PID:       pid,
			Name:      parts[0],
			User:      parts[6],
			MemoryRSS: mem,
			State:     parts[5],
			Command:   parts[0],
		})
	}

	return processes, nil
}

// getGenericProcesses uses ps for other Unix-like systems.
func getGenericProcesses() ([]ProcessInfo, error) {
	return getLinuxProcesses()
}

// buildPidToPortsMap creates a map of PID -> listening ports.
func buildPidToPortsMap() map[int][]int {
	portMap := make(map[int][]int)

	if runtime.GOOS == "linux" {
		out, err := exec.Command("ss", "-tlnp").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines[1:] {
				fields := strings.Fields(line)
				if len(fields) < 5 {
					continue
				}
				localAddr := fields[3]
				lastColon := strings.LastIndex(localAddr, ":")
				if lastColon < 0 {
					continue
				}
				port, err := strconv.Atoi(localAddr[lastColon+1:])
				if err != nil || port == 0 {
					continue
				}

				for _, f := range fields {
					if strings.HasPrefix(f, "users:") {
						if idx := strings.Index(f, "pid="); idx >= 0 {
							rest := f[idx+4:]
							if end := strings.IndexAny(rest, ",)"); end >= 0 {
								pid, _ := strconv.Atoi(rest[:end])
								if pid > 0 {
									portMap[pid] = append(portMap[pid], port)
								}
							}
						}
					}
				}
			}
		}
	} else if runtime.GOOS == "windows" {
		out, err := exec.Command("netstat", "-ano", "-p", "TCP").Output()
		if err == nil {
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
				localAddr := fields[1]
				lastColon := strings.LastIndex(localAddr, ":")
				if lastColon < 0 {
					continue
				}
				port, err := strconv.Atoi(localAddr[lastColon+1:])
				if err != nil {
					continue
				}
				pid, _ := strconv.Atoi(fields[len(fields)-1])
				if pid > 0 && port > 0 {
					portMap[pid] = append(portMap[pid], port)
				}
			}
		}
	}

	return portMap
}

// extractProcessName gets the base process name from a full command path.
func extractProcessName(command string) string {
	parts := strings.Fields(command)
	if len(parts) == 0 {
		return command
	}
	cmd := parts[0]
	// Extract basename
	if idx := strings.LastIndex(cmd, "/"); idx >= 0 {
		cmd = cmd[idx+1:]
	}
	if idx := strings.LastIndex(cmd, "\\"); idx >= 0 {
		cmd = cmd[idx+1:]
	}
	// Remove common wrappers
	cmd = strings.TrimSuffix(cmd, ":")
	if len(cmd) > 40 {
		cmd = cmd[:40] + "…"
	}
	return cmd
}

// parseCSVLine splits a CSV line respecting quoted fields.
func parseCSVLine(line string) []string {
	var fields []string
	var current strings.Builder
	inQuotes := false
	for _, r := range line {
		switch {
		case r == '"':
			inQuotes = !inQuotes
		case r == ',' && !inQuotes:
			fields = append(fields, current.String())
			current.Reset()
		default:
			current.WriteRune(r)
		}
	}
	fields = append(fields, current.String())
	return fields
}
