package security

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	"github.com/enjoys-in/secureflow/internal/fga"
	"github.com/enjoys-in/secureflow/internal/repository"
)

// AuthService handles authentication and authorization.
type AuthService struct {
	jwtSecret []byte
	userRepo  repository.UserRepository
	fgaClient *fga.Client
}

// Claims represents JWT token claims.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// NewAuthService creates a new authentication service.
func NewAuthService(secret string, userRepo repository.UserRepository, fgaClient *fga.Client) *AuthService {
	return &AuthService{
		jwtSecret: []byte(secret),
		userRepo:  userRepo,
		fgaClient: fgaClient,
	}
}

// HashPassword creates a bcrypt hash of a password.
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

// CheckPassword compares a password with its hash.
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// GenerateToken creates a JWT token for a user.
func (a *AuthService) GenerateToken(userID, email string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(constants.TokenExpiryHours * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.jwtSecret)
}

// ValidateToken parses and validates a JWT token.
func (a *AuthService) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// Register creates a new user account.
func (a *AuthService) Register(ctx context.Context, email, name, password, role string) (*db.User, string, error) {
	hash, err := HashPassword(password)
	if err != nil {
		return nil, "", fmt.Errorf("hash password: %w", err)
	}

	user := &db.User{
		Email:        email,
		Name:         name,
		PasswordHash: hash,
	}

	if err := a.userRepo.Create(ctx, user); err != nil {
		return nil, "", fmt.Errorf("create user: %w", err)
	}

	// Assign role in OpenFGA
	if a.fgaClient != nil {
		assignRole := role
		if assignRole == "" {
			assignRole = constants.RoleAdmin
		}
		_ = fga.AssignRole(ctx, a.fgaClient, user.ID, assignRole)
	}

	token, err := a.GenerateToken(user.ID, user.Email)
	if err != nil {
		return nil, "", fmt.Errorf("generate token: %w", err)
	}

	return user, token, nil
}

// Login authenticates a user and returns a JWT token.
func (a *AuthService) Login(ctx context.Context, email, password string) (*db.User, string, error) {
	user, err := a.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, "", constants.ErrInvalidCredentials
	}

	if err := CheckPassword(password, user.PasswordHash); err != nil {
		return nil, "", constants.ErrInvalidCredentials
	}

	token, err := a.GenerateToken(user.ID, user.Email)
	if err != nil {
		return nil, "", fmt.Errorf("generate token: %w", err)
	}

	return user, token, nil
}

// GenerateInviteToken creates a secure random token for invitations.
func GenerateInviteToken() (string, error) {
	b := make([]byte, constants.InviteTokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// CheckPermission verifies if a user has a specific permission via OpenFGA.
func (a *AuthService) CheckPermission(ctx context.Context, userID, relation, object string) (bool, error) {
	if a.fgaClient == nil {
		return true, nil // If OpenFGA not configured, allow all
	}
	return fga.CheckPermission(ctx, a.fgaClient, userID, relation, object)
}
