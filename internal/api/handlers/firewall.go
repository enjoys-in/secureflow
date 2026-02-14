package handlers

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	fwPkg "github.com/enjoys-in/secureflow/internal/firewall"
	"github.com/enjoys-in/secureflow/internal/repository"
	"github.com/enjoys-in/secureflow/internal/websocket"
)

// FirewallHandler handles firewall rule CRUD operations.
type FirewallHandler struct {
	ruleRepo  repository.FirewallRuleRepository
	auditRepo repository.AuditLogRepository
	fw        *fwPkg.Manager
	hub       *websocket.Hub
}

// NewFirewallHandler creates a new firewall handler.
func NewFirewallHandler(ruleRepo repository.FirewallRuleRepository, auditRepo repository.AuditLogRepository, fw *fwPkg.Manager, hub *websocket.Hub) *FirewallHandler {
	return &FirewallHandler{ruleRepo: ruleRepo, auditRepo: auditRepo, fw: fw, hub: hub}
}

// AddRuleRequest is the request body for adding a firewall rule.
type AddRuleRequest struct {
	SecurityGroupID string `json:"security_group_id"`
	Direction       string `json:"direction"`
	Protocol        string `json:"protocol"`
	Port            int    `json:"port"`
	PortRangeEnd    int    `json:"port_range_end,omitempty"`
	SourceCIDR      string `json:"source_cidr"`
	DestCIDR        string `json:"dest_cidr,omitempty"`
	Action          string `json:"action"`
	Description     string `json:"description,omitempty"`
}

// ListRules returns all firewall rules from the backend.
func (h *FirewallHandler) ListRules(c *fiber.Ctx) error {
	rules, err := h.fw.ListRules()
	if err != nil {
		return constants.ErrFirewallFailure.Wrap(err)
	}
	return c.JSON(fiber.Map{"rules": rules})
}

// AddRule creates and applies a new firewall rule.
func (h *FirewallHandler) AddRule(c *fiber.Ctx) error {
	var req AddRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	rule := fwPkg.Rule{
		ID:         uuid.New().String(),
		Direction:  strings.ToLower(req.Direction),
		Protocol:   strings.ToLower(req.Protocol),
		Port:       req.Port,
		PortEnd:    req.PortRangeEnd,
		SourceCIDR: req.SourceCIDR,
		DestCIDR:   req.DestCIDR,
		Action:     strings.ToUpper(req.Action),
	}

	if err := fwPkg.ValidateRule(rule); err != nil {
		return constants.ErrInvalidRequestBody.WithMessage(err.Error())
	}

	if h.fw.IsPortImmutable(req.Port) && strings.ToUpper(req.Action) != constants.ActionAccept {
		return constants.ErrImmutablePort
	}

	if err := h.fw.AddRule(rule); err != nil {
		userID, _ := c.Locals("user_id").(string)
		h.hub.EmitError(err.Error(), userID)
		return constants.ErrFirewallFailure.Wrap(err)
	}

	userID, _ := c.Locals("user_id").(string)
	dbRule := &db.FirewallRule{
		SecurityGroupID: req.SecurityGroupID,
		Direction:       rule.Direction,
		Protocol:        rule.Protocol,
		Port:            rule.Port,
		PortRangeEnd:    rule.PortEnd,
		SourceCIDR:      req.SourceCIDR,
		DestCIDR:        req.DestCIDR,
		Action:          rule.Action,
		Description:     req.Description,
		IsImmutable:     false,
		CreatedBy:       userID,
	}
	if err := h.ruleRepo.Create(c.Context(), dbRule); err != nil {
		return constants.ErrDatabaseFailure.WithMessage("rule applied but failed to persist to database")
	}

	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionAddRule,
		Resource: "firewall_rule:" + dbRule.ID,
		Details:  fmt.Sprintf("Added rule: port=%d protocol=%s action=%s", rule.Port, rule.Protocol, rule.Action),
		IP:       c.IP(),
	})

	h.hub.EmitRuleChange("added", dbRule.ID, userID, rule.Port)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "rule created",
		"rule":    dbRule,
	})
}

// ListAllRulesWithDetails returns all DB-stored rules with security group and creator info.
func (h *FirewallHandler) ListAllRulesWithDetails(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	rules, err := h.ruleRepo.FindAllWithDetails(c.Context(), limit, offset)
	if err != nil {
		return constants.ErrDatabaseFailure.WithMessage("failed to fetch rules")
	}

	return c.JSON(fiber.Map{
		"rules":  rules,
		"limit":  limit,
		"offset": offset,
	})
}

// DeleteRule removes a firewall rule.
func (h *FirewallHandler) DeleteRule(c *fiber.Ctx) error {
	ruleID := c.Params("id")

	dbRule, err := h.ruleRepo.FindByID(c.Context(), ruleID)
	if err != nil {
		return constants.ErrRuleNotFound
	}

	if dbRule.IsImmutable {
		return constants.ErrImmutableRule
	}

	if h.fw.IsPortImmutable(dbRule.Port) {
		return constants.ErrImmutablePort
	}

	if err := h.fw.DeleteRule(ruleID); err != nil {
		return constants.ErrFirewallFailure.Wrap(err)
	}

	if err := h.ruleRepo.DeleteNonImmutable(c.Context(), ruleID); err != nil {
		return constants.ErrDatabaseFailure.WithMessage("rule removed from firewall but failed to remove from database")
	}

	userID, _ := c.Locals("user_id").(string)
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionDeleteRule,
		Resource: "firewall_rule:" + ruleID,
		IP:       c.IP(),
	})

	h.hub.EmitRuleChange("deleted", ruleID, userID, dbRule.Port)

	return c.JSON(fiber.Map{"message": "rule deleted"})
}
