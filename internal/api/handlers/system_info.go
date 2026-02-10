package handlers

import (
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

var startTime = time.Now()

// SystemInfoHandler handles system/server information endpoints.
type SystemInfoHandler struct{}

// NewSystemInfoHandler creates a new system info handler.
func NewSystemInfoHandler() *SystemInfoHandler {
	return &SystemInfoHandler{}
}

// GetSystemInfo returns OS, architecture, and server distribution details.
func (h *SystemInfoHandler) GetSystemInfo(c *fiber.Ctx) error {
	hostname, _ := os.Hostname()

	// Read distro info from /etc/os-release (Linux)
	distro := readDistro()

	return c.JSON(fiber.Map{
		"os":             runtime.GOOS,
		"arch":           runtime.GOARCH,
		"hostname":       hostname,
		"cpus":           runtime.NumCPU(),
		"go_version":     runtime.Version(),
		"distro":         distro.Name,
		"distro_id":      distro.ID,
		"distro_version": distro.Version,
		"uptime_seconds": int(time.Since(startTime).Seconds()),
	})
}

type distroInfo struct {
	Name    string `json:"name"`
	ID      string `json:"id"`
	Version string `json:"version"`
}

// readDistro parses /etc/os-release for Linux distribution info.
// Returns empty fields on non-Linux or if the file is unreadable.
func readDistro() distroInfo {
	data, err := os.ReadFile("/etc/os-release")
	if err != nil {
		return distroInfo{Name: runtime.GOOS, ID: runtime.GOOS, Version: "unknown"}
	}

	info := distroInfo{}
	for _, line := range strings.Split(string(data), "\n") {
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.Trim(strings.TrimSpace(parts[1]), `"`)

		switch key {
		case "PRETTY_NAME":
			info.Name = val
		case "ID":
			info.ID = val
		case "VERSION_ID":
			info.Version = val
		}
	}

	if info.Name == "" {
		info.Name = runtime.GOOS
	}
	return info
}
