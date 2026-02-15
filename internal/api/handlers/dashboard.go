package handlers

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
)

// DashboardHandler serves aggregated analytics for the dashboard.
type DashboardHandler struct {
	db *sql.DB
}

// NewDashboardHandler creates a new dashboard handler.
func NewDashboardHandler(db *sql.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

// DashboardStats is the response payload for GET /dashboard/stats.
type DashboardStats struct {
	SecurityGroups int `json:"security_groups"`
	FirewallRules  int `json:"firewall_rules"`
	ImmutablePorts int `json:"immutable_ports"`
	TeamMembers    int `json:"team_members"`
	BlockedIPs     int `json:"blocked_ips"`
	InboundRules   int `json:"inbound_rules"`
	OutboundRules  int `json:"outbound_rules"`
}

// GetStats returns aggregated counts for the dashboard cards.
func (h *DashboardHandler) GetStats(c *fiber.Ctx) error {
	var stats DashboardStats

	row := h.db.QueryRowContext(c.Context(),
		`SELECT
			(SELECT COUNT(*) FROM security_groups),
			(SELECT COUNT(*) FROM firewall_rules),
			(SELECT COUNT(*) FROM immutable_ports),
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM blocked_ips WHERE status = 'blocked'),
			(SELECT COUNT(*) FROM firewall_rules WHERE direction = 'inbound'),
			(SELECT COUNT(*) FROM firewall_rules WHERE direction = 'outbound')`,
	)

	if err := row.Scan(
		&stats.SecurityGroups,
		&stats.FirewallRules,
		&stats.ImmutablePorts,
		&stats.TeamMembers,
		&stats.BlockedIPs,
		&stats.InboundRules,
		&stats.OutboundRules,
	); err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	return c.JSON(fiber.Map{"stats": stats})
}

// RecentAuditLog is a lightweight audit log entry for the dashboard.
type RecentAuditLog struct {
	ID        string `json:"id"`
	UserName  string `json:"user_name"`
	Action    string `json:"action"`
	Resource  string `json:"resource"`
	Details   string `json:"details"`
	Timestamp string `json:"timestamp"`
}

// GetRecentActivity returns the latest audit log entries for the dashboard.
func (h *DashboardHandler) GetRecentActivity(c *fiber.Ctx) error {
	rows, err := h.db.QueryContext(c.Context(),
		`SELECT a.id, COALESCE(u.name, 'System') AS user_name, a.action, a.resource,
				COALESCE(a.details, '') AS details, a.timestamp
		 FROM audit_logs a
		 LEFT JOIN users u ON a.user_id = u.id
		 ORDER BY a.timestamp DESC
		 LIMIT 10`,
	)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}
	defer rows.Close()

	var logs []RecentAuditLog
	for rows.Next() {
		var l RecentAuditLog
		if err := rows.Scan(&l.ID, &l.UserName, &l.Action, &l.Resource, &l.Details, &l.Timestamp); err != nil {
			return constants.ErrDatabaseFailure.Wrap(err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	if logs == nil {
		logs = []RecentAuditLog{}
	}

	return c.JSON(fiber.Map{"recent_activity": logs})
}
