package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
type Config struct {
	// Server
	Port        int    `yaml:"port"`
	TLSEnabled  bool   `yaml:"tls_enabled"`
	TLSCertFile string `yaml:"tls_cert_file"`
	TLSKeyFile  string `yaml:"tls_key_file"`
	// Origins
	AllowOrigins string `yaml:"allow_origins"`
	// Database
	PostgresDSN string `yaml:"postgres_dsn"`

	// OpenFGA
	OpenFGAEndpoint string `yaml:"openfga_endpoint"`
	OpenFGAStoreID  string `yaml:"openfga_store_id"`

	// Auth
	JWTSecret string `yaml:"jwt_secret"`

	// Firewall
	FirewallBackend string `yaml:"firewall_backend"` // "iptables" or "nftables"
	ImmutablePorts  []int  `yaml:"immutable_ports"`

	// Logging
	LogLevel  string `yaml:"log_level"`
	LogFormat string `yaml:"log_format"` // "json" or "text"
}

// DefaultImmutablePorts are ports that can NEVER be closed by any user.
var DefaultImmutablePorts = []int{22, 25, 465, 587, 3306, 6379}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	// Load .env file if it exists (won't override existing env vars)
	_ = godotenv.Load()

	cfg := &Config{
		Port:            getEnvInt("PORT", 8443),
		TLSEnabled:      getEnvBool("TLS_ENABLED", false),
		TLSCertFile:     getEnv("TLS_CERT_FILE", "certs/server.crt"),
		TLSKeyFile:      getEnv("TLS_KEY_FILE", "certs/server.key"),
		AllowOrigins:    getEnv("ALLOW_ORIGINS", "*"),
		PostgresDSN:     getEnv("POSTGRES_DSN", "postgres://fm_user:fm_password@localhost:5432/firewall_manager?sslmode=disable"),
		OpenFGAEndpoint: getEnv("OPENFGA_ENDPOINT", "http://localhost:8080"),
		OpenFGAStoreID:  getEnv("OPENFGA_STORE_ID", ""),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production"),
		FirewallBackend: getEnv("FIREWALL_BACKEND", "iptables"),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		LogFormat:       getEnv("LOG_FORMAT", "json"),
	}

	// Parse immutable ports from env or use defaults
	portsStr := getEnv("IMMUTABLE_PORTS", "")
	if portsStr != "" {
		ports, err := parsePorts(portsStr)
		if err != nil {
			return nil, fmt.Errorf("invalid IMMUTABLE_PORTS: %w", err)
		}
		cfg.ImmutablePorts = ports
	} else {
		cfg.ImmutablePorts = DefaultImmutablePorts
	}

	// Validate
	if cfg.JWTSecret == "change-me-in-production" {
		fmt.Fprintln(os.Stderr, "WARNING: Using default JWT secret. Set JWT_SECRET in production!")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

func parsePorts(s string) ([]int, error) {
	parts := strings.Split(s, ",")
	ports := make([]int, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		n, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid port %q: %w", p, err)
		}
		if n < 1 || n > 65535 {
			return nil, fmt.Errorf("port %d out of range (1-65535)", n)
		}
		ports = append(ports, n)
	}
	return ports, nil
}
