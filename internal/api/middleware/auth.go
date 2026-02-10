package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/security"
)

// AuthMiddleware handles JWT authentication.
type AuthMiddleware struct {
	auth *security.AuthService
}

// NewAuthMiddleware creates a new auth middleware.
func NewAuthMiddleware(auth *security.AuthService) *AuthMiddleware {
	return &AuthMiddleware{auth: auth}
}

// Authenticate validates the JWT token from the Authorization header or auth_token cookie.
func (m *AuthMiddleware) Authenticate(c *fiber.Ctx) error {
	var token string

	// Try Authorization header first
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		token = strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			return constants.ErrInvalidAuthFormat
		}
	}

	// Fall back to cookie
	if token == "" {
		token = c.Cookies("secureflow_token")
	}

	if token == "" {
		return constants.ErrMissingAuthHeader
	}

	claims, err := m.auth.ValidateToken(token)
	if err != nil {
		return constants.ErrInvalidToken
	}

	// Store user info in context for downstream handlers
	c.Locals("user_id", claims.UserID)
	c.Locals("email", claims.Email)

	return c.Next()
}

// PermissionMiddleware handles RBAC permission checks via OpenFGA.
type PermissionMiddleware struct {
	auth *security.AuthService
}

// NewPermissionMiddleware creates a new permission middleware.
func NewPermissionMiddleware(auth *security.AuthService) *PermissionMiddleware {
	return &PermissionMiddleware{auth: auth}
}

// RequirePermission returns middleware that checks if the user has the required relation.
func (m *PermissionMiddleware) RequirePermission(relation, object string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return constants.ErrUnauthorized
		}

		allowed, err := m.auth.CheckPermission(c.Context(), userID, relation, object)
		if err != nil {
			return constants.ErrPermissionCheck.Wrap(err)
		}

		if !allowed {
			return constants.ErrForbidden
		}

		return c.Next()
	}
}
