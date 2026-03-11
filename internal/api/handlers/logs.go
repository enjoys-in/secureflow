package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/repository"
)

// internalActions are audit actions that represent internal/system activity
// (logins, registrations) rather than firewall traffic operations.
var internalActions = map[string]bool{
	constants.AuditActionLogin:    true,
	constants.AuditActionRegister: true,
}

// LogsHandler handles audit logs.
type LogsHandler struct {
	auditRepo repository.AuditLogRepository
}

// NewLogsHandler creates a new logs handler.
func NewLogsHandler(auditRepo repository.AuditLogRepository) *LogsHandler {
	return &LogsHandler{auditRepo: auditRepo}
}

// ListAuditLogs returns paginated audit logs.
// Query params:
//   - limit, offset: pagination
//   - action: comma-separated action filter (e.g. "add_rule,delete_rule")
//   - exclude_internal: if "true", excludes login/register events (default: true)
func (h *LogsHandler) ListAuditLogs(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", strconv.Itoa(constants.DefaultPageLimit)))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	excludeInternal := c.Query("exclude_internal", "true") == "true"
	actionFilter := c.Query("action", "")

	if limit > constants.MaxPageLimit {
		limit = constants.MaxPageLimit
	}

	logs, err := h.auditRepo.FindAll(c.Context(), nil, limit, offset)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	// Build allowed actions set from filter param
	allowedActions := make(map[string]bool)
	if actionFilter != "" {
		for _, a := range strings.Split(actionFilter, ",") {
			a = strings.TrimSpace(a)
			if a != "" {
				allowedActions[a] = true
			}
		}
	}

	// Filter results
	filtered := logs[:0]
	for _, log := range logs {
		// Exclude internal actions if requested
		if excludeInternal && internalActions[log.Action] {
			continue
		}
		// Apply action whitelist if specified
		if len(allowedActions) > 0 && !allowedActions[log.Action] {
			continue
		}
		filtered = append(filtered, log)
	}

	return c.JSON(fiber.Map{
		"audit_logs": filtered,
		"limit":      limit,
		"offset":     offset,
	})
}
