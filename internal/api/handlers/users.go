package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	"github.com/enjoys-in/secureflow/internal/fga"
	"github.com/enjoys-in/secureflow/internal/repository"
	"github.com/enjoys-in/secureflow/internal/security"
)

// UserHandler handles user management and OpenFGA integration.
type UserHandler struct {
	userRepo  repository.UserRepository
	invRepo   repository.InvitationRepository
	auditRepo repository.AuditLogRepository
	auth      *security.AuthService
	fgaClient *fga.Client
}

// NewUserHandler creates a new user handler.
func NewUserHandler(
	userRepo repository.UserRepository,
	invRepo repository.InvitationRepository,
	auditRepo repository.AuditLogRepository,
	auth *security.AuthService,
	fgaClient *fga.Client,
) *UserHandler {
	return &UserHandler{
		userRepo:  userRepo,
		invRepo:   invRepo,
		auditRepo: auditRepo,
		auth:      auth,
		fgaClient: fgaClient,
	}
}

// InviteRequest is the request body for inviting a user.
type InviteRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

// InviteUser creates an invitation for a new user.
func (h *UserHandler) InviteUser(c *fiber.Ctx) error {
	var req InviteRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	if req.Email == "" || req.Role == "" {
		return constants.ErrMissingRequiredFields
	}

	if !constants.ValidRoles[req.Role] {
		return constants.ErrInvalidRole
	}

	token, err := security.GenerateInviteToken()
	if err != nil {
		return constants.ErrTokenGeneration.Wrap(err)
	}

	userID, _ := c.Locals("user_id").(string)
	inv := &db.Invitation{
		Email:     req.Email,
		Role:      req.Role,
		InvitedBy: userID,
		Token:     token,
		ExpiresAt: time.Now().Add(constants.InviteExpiryHours * time.Hour),
	}

	if err := h.invRepo.Create(c.Context(), inv); err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   userID,
		Action:   constants.AuditActionInviteUser,
		Resource: "invitation:" + inv.ID,
		Details:  "Invited " + req.Email + " as " + req.Role,
		IP:       c.IP(),
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":    "invitation created",
		"invitation": inv,
		"invite_url": "/api/v1/auth/accept-invite?token=" + token,
	})
}

// GetCurrentUser returns the authenticated user's info and roles.
func (h *UserHandler) GetCurrentUser(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)

	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		return constants.ErrUserNotFound
	}

	// Try to get roles from FGA, gracefully handle errors
	var roles []string
	if h.fgaClient != nil {
		for _, role := range []string{constants.RoleAdmin, constants.RoleEditor, constants.RoleViewer} {
			allowed, _ := fga.CheckPermission(c.Context(), h.fgaClient, userID, role, constants.FGAObjectSystem)
			if allowed {
				roles = append(roles, role)
			}
		}
	}

	return c.JSON(fiber.Map{
		"user":  user,
		"roles": roles,
	})
}

// memberResponse represents a user with their FGA roles for the members list.
type memberResponse struct {
	ID        string   `json:"id"`
	Email     string   `json:"email"`
	Name      string   `json:"name"`
	Roles     []string `json:"roles"`
	CreatedAt string   `json:"created_at"`
}

// ListMembers returns all users with their FGA roles.
func (h *UserHandler) ListMembers(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", strconv.Itoa(constants.DefaultPageLimit)))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	if limit > constants.MaxPageLimit {
		limit = constants.MaxPageLimit
	}

	users, err := h.userRepo.FindAll(c.Context(), nil, limit, offset)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	allRoles := []string{
		constants.RelationOwner,
		constants.RelationAdmin,
		constants.RelationEditor,
		constants.RelationViewer,
	}

	members := make([]memberResponse, 0, len(users))
	for _, u := range users {
		var roles []string
		if h.fgaClient != nil {
			for _, role := range allRoles {
				allowed, _ := fga.CheckPermission(c.Context(), h.fgaClient, u.ID, role, constants.FGAObjectSystem)
				if allowed {
					roles = append(roles, role)
				}
			}
		}
		members = append(members, memberResponse{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			Roles:     roles,
			CreatedAt: u.CreatedAt.Format("2006-01-02"),
		})
	}

	return c.JSON(fiber.Map{
		"members": members,
		"limit":   limit,
		"offset":  offset,
	})
}

// ListInvitations returns all pending invitations.
func (h *UserHandler) ListInvitations(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", strconv.Itoa(constants.DefaultPageLimit)))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	if limit > constants.MaxPageLimit {
		limit = constants.MaxPageLimit
	}

	invitations, err := h.invRepo.FindPending(c.Context(), limit, offset)
	if err != nil {
		return constants.ErrDatabaseFailure.Wrap(err)
	}

	return c.JSON(fiber.Map{
		"invitations": invitations,
		"limit":       limit,
		"offset":      offset,
	})
}
