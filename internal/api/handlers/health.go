package handlers

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// HealthHandler handles health check endpoints.
type HealthHandler struct {
	db *sql.DB
}

// NewHealthHandler creates a new health handler.
func NewHealthHandler(database *sql.DB) *HealthHandler {
	return &HealthHandler{db: database}
}

// HealthCheck returns the system health status.
func (h *HealthHandler) HealthCheck(c *fiber.Ctx) error {
	dbOK := true
	if err := h.db.Ping(); err != nil {
		dbOK = false
	}

	return c.JSON(fiber.Map{
		"status":   "ok",
		"database": dbOK,
		"firewall": true,
	})
}
