package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	"github.com/enjoys-in/secureflow/internal/fga"
	"github.com/enjoys-in/secureflow/internal/repository"
	"github.com/enjoys-in/secureflow/internal/security"
)

const COOKIE_NAME = "secureflow_token"

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	auth      *security.AuthService
	userRepo  repository.UserRepository
	invRepo   repository.InvitationRepository
	auditRepo repository.AuditLogRepository
	fgaClient *fga.Client
}

// NewAuthHandler creates a new auth handler.
func NewAuthHandler(auth *security.AuthService, userRepo repository.UserRepository, invRepo repository.InvitationRepository, auditRepo repository.AuditLogRepository, fgaClient *fga.Client) *AuthHandler {
	return &AuthHandler{auth: auth, userRepo: userRepo, invRepo: invRepo, auditRepo: auditRepo, fgaClient: fgaClient}
}

// RegisterRequest is the request body for registration.
type RegisterRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

// LoginRequest is the request body for login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Register creates a new user account.
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	if req.Email == "" || req.Name == "" || req.Password == "" {
		return constants.ErrMissingRequiredFields
	}

	if len(req.Password) < constants.MinPasswordLength {
		return constants.ErrPasswordTooShort
	}

	user, token, err := h.auth.Register(c.Context(), req.Email, req.Name, req.Password, constants.RoleAdmin)
	if err != nil {
		return constants.ErrUserAlreadyExists.Wrap(err)
	}

	setAuthCookie(c, token)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "user registered",
		"user":    user,
		"token":   token,
	})
}

// Login authenticates a user and returns a JWT.
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	user, token, err := h.auth.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return constants.ErrInvalidCredentials
	}

	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   user.ID,
		Action:   constants.AuditActionLogin,
		Resource: "auth",
		IP:       c.IP(),
	})

	setAuthCookie(c, token)

	return c.JSON(fiber.Map{
		"message": "login successful",
		"user":    user,
		"token":   token,
	})
}

// AcceptInvite processes an invitation token and registers the invited user.
func (h *AuthHandler) AcceptInvite(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return constants.ErrTokenRequired
	}

	inv, err := h.invRepo.FindByToken(c.Context(), token)
	if err != nil {
		return constants.ErrInvitationNotFound
	}

	if inv.AcceptedAt != nil {
		return constants.ErrInvitationAccepted
	}

	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody.WithMessage("provide name and password to complete registration")
	}

	user, jwtToken, err := h.auth.Register(c.Context(), inv.Email, req.Name, req.Password, inv.Role)
	if err != nil {
		return constants.ErrInternal.Wrap(err)
	}

	_ = h.invRepo.Accept(c.Context(), inv.ID)

	setAuthCookie(c, jwtToken)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "invitation accepted, user registered",
		"user":    user,
		"token":   jwtToken,
		"role":    inv.Role,
	})
}

// RegisterAdmin creates a new admin/owner account with full super-admin permissions.
func (h *AuthHandler) RegisterAdmin(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return constants.ErrInvalidRequestBody
	}

	if req.Email == "" || req.Name == "" || req.Password == "" {
		return constants.ErrMissingRequiredFields
	}

	if len(req.Password) < constants.MinPasswordLength {
		return constants.ErrPasswordTooShort
	}

	// Register user in DB and assign admin role via auth service
	user, token, err := h.auth.Register(c.Context(), req.Email, req.Name, req.Password, constants.RoleAdmin)
	if err != nil {
		return constants.ErrUserAlreadyExists.Wrap(err)
	}

	// Assign owner (super-admin) tuples on system and firewall objects
	if h.fgaClient != nil {
		_ = fga.AssignRole(c.Context(), h.fgaClient, user.ID, constants.RelationOwner)

		userKey := "user:" + user.ID
		_ = h.fgaClient.WriteTuple(c.Context(), userKey, constants.RelationOwner, constants.FGAObjectFirewall)
	}

	// Audit log
	_ = h.auditRepo.Create(c.Context(), &db.AuditLog{
		UserID:   user.ID,
		Action:   constants.AuditActionRegister,
		Resource: "auth",
		Details:  "admin user registered with owner permissions",
		IP:       c.IP(),
	})

	setAuthCookie(c, token)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "admin registered",
		"user":    user,
		"token":   token,
		"role":    constants.RelationOwner,
	})
}

// setAuthCookie sets the JWT token as an HTTP-only cookie.
func setAuthCookie(c *fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     COOKIE_NAME,
		Value:    token,
		Path:     "/",
		HTTPOnly: true,
		Secure:   false,  // set to true in production with HTTPS
		SameSite: "None", // adjust as needed (e.g. "Lax" or "Strict")
		Expires:  time.Now().Add(24 * time.Hour),
	})
}
