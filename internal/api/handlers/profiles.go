package handlers

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	fwPkg "github.com/enjoys-in/secureflow/internal/firewall"
	"github.com/enjoys-in/secureflow/internal/repository"
	"github.com/enjoys-in/secureflow/internal/websocket"
)

// ProfileHandler handles security group/profile operations.
type ProfileHandler struct {
	sgRepo    repository.SecurityGroupRepository
	ruleRepo  repository.FirewallRuleRepository
	auditRepo repository.AuditLogRepository
	fw        *fwPkg.Manager
	hub       *websocket.Hub
}

// NewProfileHandler creates a new profile handler.
func NewProfileHandler(sgRepo repository.SecurityGroupRepository, ruleRepo repository.FirewallRuleRepository, auditRepo repository.AuditLogRepository, fw *fwPkg.Manager, hub *websocket.Hub) *ProfileHandler {
	return &ProfileHandler{sgRepo: sgRepo, ruleRepo: ruleRepo, auditRepo: auditRepo, fw: fw, hub: hub}
}

// CreateSecurityGroupRequest is the request body for creating a security group.
type CreateSecurityGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// ListSecurityGroups returns all security groups.
func (h *ProfileHandler) ListSecurityGroups(c *fiber.Ctx) error {
	groups, err := h.sgRepo.FindAll(c.Context(), nil, constants.MaxPageLimit, 0)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}
	return c.JSON(fiber.Map{"security_groups": groups})
}

// CreateSecurityGroup creates a new security group.
func (h *ProfileHandler) CreateSecurityGroup(c *fiber.Ctx) error {
	var req CreateSecurityGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	if req.Name == "" {
		return constants.ErrNameRequired
	}

	userID, _ := c.Locals("user_id").(string)
	sg := &db.SecurityGroup{
		Name:        req.Name,
		Description: req.Description,
		CreatedBy:   userID,
	}

	if err := h.sgRepo.Create(c.Context(), sg); err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionCreateSecurityGroup,
		Resource: "security_group:" + sg.ID,
		Details:  "Created security group: " + sg.Name,
		IP:       c.IP(),
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":        "security group created",
		"security_group": sg,
	})
}

// GetSecurityGroup returns a specific security group with its rules.
func (h *ProfileHandler) GetSecurityGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	sg, err := h.sgRepo.FindByID(c.Context(), id)
	if err != nil {
		return constants.ErrSecurityGroupNotFound
	}

	rules, err := h.ruleRepo.FindBySecurityGroup(c.Context(), id)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	return c.JSON(fiber.Map{
		"security_group": sg,
		"rules":          rules,
	})
}

// UpdateSecurityGroup updates a security group's metadata.
func (h *ProfileHandler) UpdateSecurityGroup(c *fiber.Ctx) error {
	id := c.Params("id")
	var req CreateSecurityGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	updates := map[string]interface{}{
		"name":        req.Name,
		"description": req.Description,
	}
	sg, err := h.sgRepo.FindByIDAndUpdate(c.Context(), id, updates)
	if err != nil {
		return constants.ErrSecurityGroupNotFound
	}

	userID, _ := c.Locals("user_id").(string)
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionUpdateSecurityGroup,
		Resource: "security_group:" + id,
		IP:       c.IP(),
	})

	return c.JSON(fiber.Map{"message": "security group updated", "security_group": sg})
}

// DeleteSecurityGroup deletes a security group and its rules (CASCADE).
func (h *ProfileHandler) DeleteSecurityGroup(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.sgRepo.DeleteOne(c.Context(), id); err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	userID, _ := c.Locals("user_id").(string)
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionDeleteSecurityGroup,
		Resource: "security_group:" + id,
		IP:       c.IP(),
	})

	return c.JSON(fiber.Map{"message": "security group deleted"})
}

// AddRuleToGroup adds a firewall rule to a security group.
func (h *ProfileHandler) AddRuleToGroup(c *fiber.Ctx) error {
	sgID := c.Params("id")
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

	userID, _ := c.Locals("user_id").(string)
	dbRule := &db.FirewallRule{
		SecurityGroupID: sgID,
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
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "rule added to security group",
		"rule":    dbRule,
	})
}

// ListGroupRules lists all rules in a security group.
func (h *ProfileHandler) ListGroupRules(c *fiber.Ctx) error {
	sgID := c.Params("id")
	rules, err := h.ruleRepo.FindBySecurityGroup(c.Context(), sgID)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}
	return c.JSON(fiber.Map{"rules": rules})
}

// DeleteRuleFromGroup deletes a rule from a security group.
func (h *ProfileHandler) DeleteRuleFromGroup(c *fiber.Ctx) error {
	ruleID := c.Params("ruleId")

	dbRule, err := h.ruleRepo.FindByID(c.Context(), ruleID)
	if err != nil {
		return constants.ErrRuleNotFound
	}

	if dbRule.IsImmutable {
		return constants.ErrImmutableRule
	}

	if err := h.ruleRepo.DeleteNonImmutable(c.Context(), ruleID); err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	return c.JSON(fiber.Map{"message": "rule deleted"})
}

// ApplySecurityGroup applies all rules of a security group to the firewall backend.
func (h *ProfileHandler) ApplySecurityGroup(c *fiber.Ctx) error {
	sgID := c.Params("id")

	dbRules, err := h.ruleRepo.FindBySecurityGroup(c.Context(), sgID)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	var fwRules []fwPkg.Rule
	for _, r := range dbRules {
		fwRules = append(fwRules, fwPkg.Rule{
			ID:         r.ID,
			Direction:  r.Direction,
			Protocol:   r.Protocol,
			Port:       r.Port,
			PortEnd:    r.PortRangeEnd,
			SourceCIDR: r.SourceCIDR,
			DestCIDR:   r.DestCIDR,
			Action:     r.Action,
		})
	}

	if err := h.fw.ApplyRules(fwRules); err != nil {
		userID, _ := c.Locals("user_id").(string)
		h.hub.EmitError("Failed to apply security group: "+err.Error(), userID)
		return constants.ErrFirewallFailure.Wrap(err)
	}

	userID, _ := c.Locals("user_id").(string)
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionApplySecurityGroup,
		Resource: "security_group:" + sgID,
		Details:  fmt.Sprintf("Applied security group with %d rules", len(fwRules)),
		IP:       c.IP(),
	})

	h.hub.EmitRuleChange("security_group_applied", sgID, userID, 0)

	return c.JSON(fiber.Map{
		"message":     "security group applied",
		"rules_count": len(fwRules),
	})
}
