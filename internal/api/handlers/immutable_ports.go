package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	"github.com/enjoys-in/secureflow/internal/repository"
)

// ImmutablePortsHandler handles immutable port management endpoints.
type ImmutablePortsHandler struct {
	portRepo  repository.ImmutablePortRepository
	auditRepo repository.AuditLogRepository
}

// NewImmutablePortsHandler creates a new immutable ports handler.
func NewImmutablePortsHandler(portRepo repository.ImmutablePortRepository, auditRepo repository.AuditLogRepository) *ImmutablePortsHandler {
	return &ImmutablePortsHandler{portRepo: portRepo, auditRepo: auditRepo}
}

// AddPortRequest is the request body for adding an immutable port.
type AddPortRequest struct {
	Port        int    `json:"port"`
	Protocol    string `json:"protocol"`
	ServiceName string `json:"service_name"`
}

// ListPorts returns all immutable ports.
func (h *ImmutablePortsHandler) ListPorts(c *fiber.Ctx) error {
	ports, err := h.portRepo.FindAll(c.Context())
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	return c.JSON(fiber.Map{
		"immutable_ports": ports,
		"message":         "Default ports cannot be deleted. User-added ports can be removed.",
	})
}

// AddPort adds a new user-managed immutable port.
func (h *ImmutablePortsHandler) AddPort(c *fiber.Ctx) error {
	var req AddPortRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	if req.Port < 1 || req.Port > 65535 {
		return constants.ErrInvalidPort
	}

	if req.Protocol == "" {
		req.Protocol = "tcp"
	}

	// Check if port already exists
	existing, _ := h.portRepo.FindByPort(c.Context(), req.Port, req.Protocol)
	if existing != nil {
		return constants.ErrPortAlreadyImmutable
	}

	userID, _ := c.Locals("user_id").(string)
	port := &db.ImmutablePort{
		Port:        req.Port,
		Protocol:    req.Protocol,
		ServiceName: req.ServiceName,
		IsDefault:   false,
		AddedBy:     &userID,
	}

	if err := h.portRepo.Create(c.Context(), port); err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	// Audit log
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionAddImmutablePort,
		Resource: "immutable_port:" + strconv.Itoa(req.Port),
		Details:  "Added immutable port: " + strconv.Itoa(req.Port) + "/" + req.Protocol,
		IP:       c.IP(),
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "immutable port added",
		"port":    port,
	})
}

// DeletePort removes a user-added immutable port. Default ports cannot be deleted.
func (h *ImmutablePortsHandler) DeletePort(c *fiber.Ctx) error {
	portID := c.Params("id")

	if err := h.portRepo.DeleteOne(c.Context(), portID); err != nil {
		if err.Error() == "default immutable ports cannot be deleted" {
			return constants.ErrDefaultPortUndeletable
		}
		return constants.ErrPortNotFound
	}

	userID, _ := c.Locals("user_id").(string)
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionDeleteImmutablePort,
		Resource: "immutable_port:" + portID,
		IP:       c.IP(),
	})

	return c.JSON(fiber.Map{"message": "immutable port deleted"})
}
