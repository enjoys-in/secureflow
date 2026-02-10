package constants

import (
	"fmt"
	"net/http"
)

// AppError is a strongly typed application error with HTTP status code.
type AppError struct {
	Status  int    `json:"status"`
	Code    string `json:"code"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap returns the wrapped error.
func (e *AppError) Unwrap() error {
	return e.Err
}

// WithMessage returns a copy of the error with a custom message.
func (e *AppError) WithMessage(msg string) *AppError {
	return &AppError{
		Status:  e.Status,
		Code:    e.Code,
		Message: msg,
		Err:     e.Err,
	}
}

// Wrap returns a copy of the error wrapping an underlying error.
func (e *AppError) Wrap(err error) *AppError {
	return &AppError{
		Status:  e.Status,
		Code:    e.Code,
		Message: e.Message,
		Err:     err,
	}
}

// --- 400 Bad Request ---
var (
	ErrInvalidRequestBody    = &AppError{Status: http.StatusBadRequest, Code: "INVALID_REQUEST_BODY", Message: "invalid request body"}
	ErrMissingRequiredFields = &AppError{Status: http.StatusBadRequest, Code: "MISSING_REQUIRED_FIELDS", Message: "one or more required fields are missing"}
	ErrInvalidEmail          = &AppError{Status: http.StatusBadRequest, Code: "INVALID_EMAIL", Message: "invalid email address"}
	ErrPasswordTooShort      = &AppError{Status: http.StatusBadRequest, Code: "PASSWORD_TOO_SHORT", Message: "password must be at least 8 characters"}
	ErrInvalidRole           = &AppError{Status: http.StatusBadRequest, Code: "INVALID_ROLE", Message: "role must be viewer, editor, or admin"}
	ErrInvalidPort           = &AppError{Status: http.StatusBadRequest, Code: "INVALID_PORT", Message: "port must be between 0 and 65535"}
	ErrInvalidProtocol       = &AppError{Status: http.StatusBadRequest, Code: "INVALID_PROTOCOL", Message: "protocol must be tcp, udp, icmp, or all"}
	ErrInvalidDirection      = &AppError{Status: http.StatusBadRequest, Code: "INVALID_DIRECTION", Message: "direction must be inbound or outbound"}
	ErrInvalidAction         = &AppError{Status: http.StatusBadRequest, Code: "INVALID_ACTION", Message: "action must be ACCEPT, DROP, or REJECT"}
	ErrInvalidCIDR           = &AppError{Status: http.StatusBadRequest, Code: "INVALID_CIDR", Message: "invalid CIDR notation"}
	ErrInvalidPortRange      = &AppError{Status: http.StatusBadRequest, Code: "INVALID_PORT_RANGE", Message: "port range end must be greater than start"}
	ErrTokenRequired         = &AppError{Status: http.StatusBadRequest, Code: "TOKEN_REQUIRED", Message: "token is required"}
	ErrNameRequired          = &AppError{Status: http.StatusBadRequest, Code: "NAME_REQUIRED", Message: "name is required"}
)

// --- 401 Unauthorized ---
var (
	ErrUnauthorized       = &AppError{Status: http.StatusUnauthorized, Code: "UNAUTHORIZED", Message: "authentication required"}
	ErrInvalidToken       = &AppError{Status: http.StatusUnauthorized, Code: "INVALID_TOKEN", Message: "invalid or expired token"}
	ErrInvalidCredentials = &AppError{Status: http.StatusUnauthorized, Code: "INVALID_CREDENTIALS", Message: "invalid email or password"}
	ErrMissingAuthHeader  = &AppError{Status: http.StatusUnauthorized, Code: "MISSING_AUTH_HEADER", Message: "missing authorization header"}
	ErrInvalidAuthFormat  = &AppError{Status: http.StatusUnauthorized, Code: "INVALID_AUTH_FORMAT", Message: "invalid authorization format (use Bearer <token>)"}
)

// --- 403 Forbidden ---
var (
	ErrForbidden              = &AppError{Status: http.StatusForbidden, Code: "FORBIDDEN", Message: "insufficient permissions"}
	ErrImmutablePort          = &AppError{Status: http.StatusForbidden, Code: "IMMUTABLE_PORT", Message: "this port is immutable and cannot be blocked"}
	ErrImmutableRule          = &AppError{Status: http.StatusForbidden, Code: "IMMUTABLE_RULE", Message: "cannot delete immutable rule"}
	ErrDefaultPortUndeletable = &AppError{Status: http.StatusForbidden, Code: "DEFAULT_PORT_UNDELETABLE", Message: "default immutable ports cannot be deleted"}
)

// --- 404 Not Found ---
var (
	ErrNotFound              = &AppError{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: "resource not found"}
	ErrUserNotFound          = &AppError{Status: http.StatusNotFound, Code: "USER_NOT_FOUND", Message: "user not found"}
	ErrRuleNotFound          = &AppError{Status: http.StatusNotFound, Code: "RULE_NOT_FOUND", Message: "firewall rule not found"}
	ErrSecurityGroupNotFound = &AppError{Status: http.StatusNotFound, Code: "SECURITY_GROUP_NOT_FOUND", Message: "security group not found"}
	ErrInvitationNotFound    = &AppError{Status: http.StatusNotFound, Code: "INVITATION_NOT_FOUND", Message: "invitation not found or expired"}
	ErrPortNotFound          = &AppError{Status: http.StatusNotFound, Code: "PORT_NOT_FOUND", Message: "immutable port not found"}
)

// --- 409 Conflict ---
var (
	ErrConflict             = &AppError{Status: http.StatusConflict, Code: "CONFLICT", Message: "resource already exists"}
	ErrUserAlreadyExists    = &AppError{Status: http.StatusConflict, Code: "USER_ALREADY_EXISTS", Message: "user with this email already exists"}
	ErrInvitationAccepted   = &AppError{Status: http.StatusConflict, Code: "INVITATION_ALREADY_ACCEPTED", Message: "invitation already accepted"}
	ErrPortAlreadyImmutable = &AppError{Status: http.StatusConflict, Code: "PORT_ALREADY_IMMUTABLE", Message: "port is already in the immutable list"}
)

// --- 500 Internal Server Error ---
var (
	ErrInternal         = &AppError{Status: http.StatusInternalServerError, Code: "INTERNAL_ERROR", Message: "internal server error"}
	ErrDatabaseFailure  = &AppError{Status: http.StatusInternalServerError, Code: "DATABASE_ERROR", Message: "database operation failed"}
	ErrFirewallFailure  = &AppError{Status: http.StatusInternalServerError, Code: "FIREWALL_ERROR", Message: "firewall operation failed"}
	ErrPermissionCheck  = &AppError{Status: http.StatusInternalServerError, Code: "PERMISSION_CHECK_ERROR", Message: "permission check failed"}
	ErrTokenGeneration  = &AppError{Status: http.StatusInternalServerError, Code: "TOKEN_GENERATION_ERROR", Message: "failed to generate token"}
	ErrFGAFailure       = &AppError{Status: http.StatusInternalServerError, Code: "FGA_ERROR", Message: "authorization service error"}
	ErrMigrationFailure = &AppError{Status: http.StatusInternalServerError, Code: "MIGRATION_ERROR", Message: "database migration failed"}
)
