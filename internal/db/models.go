package db

import "time"

// User represents a registered user.
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Server represents a managed server/VPS.
type Server struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	IPAddress   string    `json:"ip_address"`
	Description string    `json:"description"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SecurityGroup is an AWS-style collection of firewall rules.
type SecurityGroup struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// FirewallRule represents a single firewall rule.
type FirewallRule struct {
	ID              string    `json:"id"`
	SecurityGroupID string    `json:"security_group_id"`
	Direction       string    `json:"direction"` // "inbound" or "outbound"
	Protocol        string    `json:"protocol"`  // "tcp", "udp", "icmp", "all"
	Port            int       `json:"port"`
	PortRangeEnd    int       `json:"port_range_end,omitempty"` // 0 means single port
	SourceCIDR      string    `json:"source_cidr"`              // e.g., "0.0.0.0/0"
	DestCIDR        string    `json:"dest_cidr,omitempty"`
	Action          string    `json:"action"` // "ACCEPT", "DROP", "REJECT"
	Description     string    `json:"description,omitempty"`
	IsImmutable     bool      `json:"is_immutable"`
	CreatedBy       string    `json:"created_by"`
	CreatedAt       time.Time `json:"created_at"`
}

// ServerSecurityGroup links a security group to a server.
type ServerSecurityGroup struct {
	ServerID        string    `json:"server_id"`
	SecurityGroupID string    `json:"security_group_id"`
	AppliedAt       time.Time `json:"applied_at"`
	AppliedBy       string    `json:"applied_by"`
}

// AuditLog records every significant action.
type AuditLog struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Action    string    `json:"action"`
	Resource  string    `json:"resource"`
	Details   string    `json:"details"`
	IP        string    `json:"ip"`
	Timestamp time.Time `json:"timestamp"`
}

// AuditLogWithUser extends AuditLog with user info.
type AuditLogWithUser struct {
	AuditLog
	UserEmail string `json:"user_email"`
	UserName  string `json:"user_name"`
}

// Invitation tracks pending user invitations.
type Invitation struct {
	ID         string     `json:"id"`
	Email      string     `json:"email"`
	Role       string     `json:"role"` // "viewer", "editor", "admin"
	InvitedBy  string     `json:"invited_by"`
	Token      string     `json:"-"`
	ExpiresAt  time.Time  `json:"expires_at"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ImmutablePort represents a port that must always remain open.
type ImmutablePort struct {
	ID          string    `json:"id"`
	Port        int       `json:"port"`
	Protocol    string    `json:"protocol"`
	ServiceName string    `json:"service_name"`
	IsDefault   bool      `json:"is_default"`
	AddedBy     *string   `json:"added_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}
