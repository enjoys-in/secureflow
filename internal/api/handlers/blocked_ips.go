package handlers

import (
	"fmt"
	"net"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	fwPkg "github.com/enjoys-in/secureflow/internal/firewall"
	"github.com/enjoys-in/secureflow/internal/repository"
	"github.com/enjoys-in/secureflow/internal/websocket"
)

// BlockedIPHandler handles blocked IP CRUD operations.
type BlockedIPHandler struct {
	repo      repository.BlockedIPRepository
	auditRepo repository.AuditLogRepository
	fw        *fwPkg.Manager
	hub       *websocket.Hub
}

// NewBlockedIPHandler creates a new blocked IP handler.
func NewBlockedIPHandler(repo repository.BlockedIPRepository, auditRepo repository.AuditLogRepository, fw *fwPkg.Manager, hub *websocket.Hub) *BlockedIPHandler {
	return &BlockedIPHandler{repo: repo, auditRepo: auditRepo, fw: fw, hub: hub}
}

// BlockIPsRequest is the request body to block one or more IPs.
type BlockIPsRequest struct {
	IPs    []string `json:"ips"`
	Reason string   `json:"reason"`
}

// UnblockIPsRequest is the request body to unblock one or more IPs.
type UnblockIPsRequest struct {
	IPs []string `json:"ips,omitempty"`
	ID  string   `json:"id,omitempty"`
}

// ListBlockedIPs returns all blocked/unblocked IPs with user details.
func (h *BlockedIPHandler) ListBlockedIPs(c *fiber.Ctx) error {
	status := c.Query("status", "all")
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	entries, err := h.repo.FindAll(c.Context(), status, limit, offset)
	if err != nil {
		return constants.ErrDatabaseFailure.WithMessage("failed to fetch blocked IPs")
	}

	blockedCount, _ := h.repo.Count(c.Context(), "blocked")
	unblockedCount, _ := h.repo.Count(c.Context(), "unblocked")
	total, _ := h.repo.Count(c.Context(), "all")

	return c.JSON(fiber.Map{
		"blocked_ips":     entries,
		"total":           total,
		"blocked_count":   blockedCount,
		"unblocked_count": unblockedCount,
		"limit":           limit,
		"offset":          offset,
	})
}

// BlockIPs blocks one or more IP addresses/CIDRs.
func (h *BlockedIPHandler) BlockIPs(c *fiber.Ctx) error {
	var req BlockIPsRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	if len(req.IPs) == 0 {
		return constants.ErrInvalidRequestBody.WithMessage("at least one IP is required")
	}

	userID, _ := c.Locals("user_id").(string)
	reason := req.Reason
	if reason == "" {
		reason = "Manual block"
	}

	// Validate IPs
	var validIPs []string
	var invalidIPs []string
	for _, ip := range req.IPs {
		ip = strings.TrimSpace(ip)
		if isValidIPOrCIDR(ip) {
			validIPs = append(validIPs, ip)
		} else {
			invalidIPs = append(invalidIPs, ip)
		}
	}

	if len(validIPs) == 0 {
		return constants.ErrInvalidRequestBody.WithMessage("no valid IPs provided")
	}

	// Create DB entries
	var entries []db.BlockedIP
	for _, ip := range validIPs {
		entries = append(entries, db.BlockedIP{
			IP:        ip,
			Reason:    reason,
			BlockedBy: userID,
		})
	}

	created, err := h.repo.BulkCreate(c.Context(), entries)
	if err != nil {
		return constants.ErrDatabaseFailure.WithMessage("failed to block IPs")
	}

	// Apply firewall rules to actually block the IPs
	for _, ip := range validIPs {
		cidr := ip
		if !strings.Contains(cidr, "/") {
			cidr = ip + "/32"
		}
		rule := fwPkg.Rule{
			Direction:  "inbound",
			Protocol:   "all",
			SourceCIDR: cidr,
			Action:     constants.ActionDrop,
		}
		_ = h.fw.AddRule(rule)
	}

	// Audit log
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   "block_ips",
		Resource: "blocked_ips",
		Details:  fmt.Sprintf("Blocked %d IPs: %s. Reason: %s", created, strings.Join(validIPs, ", "), reason),
		IP:       c.IP(),
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     fmt.Sprintf("%d IP(s) blocked", created),
		"blocked":     created,
		"invalid_ips": invalidIPs,
	})
}

// UnblockIPs unblocks IP addresses.
func (h *BlockedIPHandler) UnblockIPs(c *fiber.Ctx) error {
	var req UnblockIPsRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	userID, _ := c.Locals("user_id").(string)

	// Single unblock by ID
	if req.ID != "" {
		if err := h.repo.Unblock(c.Context(), req.ID, userID); err != nil {
			return constants.ErrDatabaseFailure.WithMessage("failed to unblock IP")
		}

		_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
			UserID:   userID,
			Action:   "unblock_ip",
			Resource: "blocked_ips:" + req.ID,
			IP:       c.IP(),
		})

		return c.JSON(fiber.Map{"message": "IP unblocked"})
	}

	// Bulk unblock by IPs
	if len(req.IPs) == 0 {
		return constants.ErrInvalidRequestBody.WithMessage("provide either id or ips")
	}

	unblocked, err := h.repo.BulkUnblock(c.Context(), req.IPs, userID)
	if err != nil {
		return constants.ErrDatabaseFailure.WithMessage("failed to unblock IPs")
	}

	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   "unblock_ips",
		Resource: "blocked_ips",
		Details:  fmt.Sprintf("Unblocked %d IPs: %s", unblocked, strings.Join(req.IPs, ", ")),
		IP:       c.IP(),
	})

	return c.JSON(fiber.Map{
		"message":   fmt.Sprintf("%d IP(s) unblocked", unblocked),
		"unblocked": unblocked,
	})
}

// ReblockIP re-blocks a previously unblocked IP.
func (h *BlockedIPHandler) ReblockIP(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.repo.Reblock(c.Context(), id); err != nil {
		return constants.ErrDatabaseFailure.WithMessage("failed to re-block IP")
	}

	userID, _ := c.Locals("user_id").(string)
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   "reblock_ip",
		Resource: "blocked_ips:" + id,
		IP:       c.IP(),
	})

	return c.JSON(fiber.Map{"message": "IP re-blocked"})
}

// isValidIPOrCIDR validates an IP address or CIDR range.
func isValidIPOrCIDR(s string) bool {
	s = strings.TrimSpace(s)
	if s == "" {
		return false
	}

	// Check CIDR
	if strings.Contains(s, "/") {
		_, _, err := net.ParseCIDR(s)
		return err == nil
	}

	// Check plain IP
	return net.ParseIP(s) != nil
}
