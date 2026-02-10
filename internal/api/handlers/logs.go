package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/repository"
)

// LogsHandler handles audit logs.
type LogsHandler struct {
	auditRepo repository.AuditLogRepository
}

// NewLogsHandler creates a new logs handler.
func NewLogsHandler(auditRepo repository.AuditLogRepository) *LogsHandler {
	return &LogsHandler{auditRepo: auditRepo}
}

// ListAuditLogs returns paginated audit logs.
func (h *LogsHandler) ListAuditLogs(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", strconv.Itoa(constants.DefaultPageLimit)))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	if limit > constants.MaxPageLimit {
		limit = constants.MaxPageLimit
	}

	logs, err := h.auditRepo.FindAll(c.Context(), nil, limit, offset)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	return c.JSON(fiber.Map{
		"audit_logs": logs,
		"limit":      limit,
		"offset":     offset,
	})
}
