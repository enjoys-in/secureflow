package api

import (
	"database/sql"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/enjoys-in/secureflow/internal/api/handlers"
	"github.com/enjoys-in/secureflow/internal/api/middleware"
	"github.com/enjoys-in/secureflow/internal/config"
	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/fga"
	"github.com/enjoys-in/secureflow/internal/firewall"
	"github.com/enjoys-in/secureflow/internal/repository"
	"github.com/enjoys-in/secureflow/internal/security"
	ws "github.com/enjoys-in/secureflow/internal/websocket"
	"github.com/enjoys-in/secureflow/pkg/logger"
)

// ServerDeps holds all dependencies required by the API server.
type ServerDeps struct {
	Config   *config.Config
	Logger   *logger.Logger
	DB       *sql.DB
	Auth     *security.AuthService
	FGA      *fga.Client
	Firewall *firewall.Manager
	Hub      *ws.Hub

	// Repositories
	UserRepo          repository.UserRepository
	FirewallRuleRepo  repository.FirewallRuleRepository
	SecurityGroupRepo repository.SecurityGroupRepository
	AuditLogRepo      repository.AuditLogRepository
	InvitationRepo    repository.InvitationRepository
	ImmutablePortRepo repository.ImmutablePortRepository
	BlockedIPRepo     repository.BlockedIPRepository
}

// NewServer creates and configures the Fiber application with all routes.
func NewServer(deps ServerDeps) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: middleware.ErrorHandler,
		AppName:      "Firewall Manager",
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     deps.Config.AllowOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, PATCH, OPTIONS",
		AllowCredentials: true,
	}))

	// ---- Handlers ----
	healthH := handlers.NewHealthHandler(deps.DB)
	authH := handlers.NewAuthHandler(deps.Auth, deps.UserRepo, deps.InvitationRepo, deps.AuditLogRepo, deps.FGA)
	firewallH := handlers.NewFirewallHandler(deps.FirewallRuleRepo, deps.AuditLogRepo, deps.Firewall, deps.Hub)
	profileH := handlers.NewProfileHandler(deps.SecurityGroupRepo, deps.FirewallRuleRepo, deps.AuditLogRepo, deps.Firewall, deps.Hub)
	userH := handlers.NewUserHandler(deps.UserRepo, deps.InvitationRepo, deps.AuditLogRepo, deps.Auth, deps.FGA)
	logsH := handlers.NewLogsHandler(deps.AuditLogRepo)
	portsH := handlers.NewImmutablePortsHandler(deps.ImmutablePortRepo, deps.AuditLogRepo)
	sysPortsH := handlers.NewSystemPortsHandler()
	processH := handlers.NewProcessHandler()
	blockedIPH := handlers.NewBlockedIPHandler(deps.BlockedIPRepo, deps.AuditLogRepo, deps.Firewall, deps.Hub)

	// ---- Middleware ----
	authMW := middleware.NewAuthMiddleware(deps.Auth)
	permMW := middleware.NewPermissionMiddleware(deps.Auth)

	// ---- Routes ----
	v1 := app.Group("/api/v1")

	// Health (public)
	v1.Get("/health", healthH.HealthCheck)

	// Auth (public)
	auth := v1.Group("/auth")
	auth.Post("/register", authH.Register)
	auth.Post("/register-admin", authH.RegisterAdmin)
	auth.Post("/login", authH.Login)
	auth.Post("/accept-invite", authH.AcceptInvite)

	// Protected routes
	protected := v1.Group("", authMW.Authenticate)

	// Firewall rules (editor+)
	rules := protected.Group("/rules")
	rules.Get("/", firewallH.ListRules)
	rules.Get("/all", firewallH.ListAllRulesWithDetails)
	rules.Post("/", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), firewallH.AddRule)
	rules.Delete("/:id", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), firewallH.DeleteRule)

	// System info
	system := protected.Group("/system")
	system.Get("/ports", sysPortsH.ListListeningPorts)
	system.Get("/processes", processH.ListProcesses)

	// Blocked IPs (editor+)
	blockedIPs := protected.Group("/blocked-ips")
	blockedIPs.Get("/", blockedIPH.ListBlockedIPs)
	blockedIPs.Post("/block", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), blockedIPH.BlockIPs)
	blockedIPs.Post("/unblock", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), blockedIPH.UnblockIPs)
	blockedIPs.Post("/reblock/:id", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), blockedIPH.ReblockIP)

	// Security groups / profiles (editor+)
	profiles := protected.Group("/profiles")
	profiles.Get("/", profileH.ListSecurityGroups)
	profiles.Post("/", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), profileH.CreateSecurityGroup)
	profiles.Get("/:id", profileH.GetSecurityGroup)
	profiles.Put("/:id", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), profileH.UpdateSecurityGroup)
	profiles.Delete("/:id", permMW.RequirePermission(constants.RelationCanAdmin, constants.FGAObjectFirewall), profileH.DeleteSecurityGroup)
	profiles.Post("/:id/rules", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), profileH.AddRuleToGroup)
	profiles.Get("/:id/rules", profileH.ListGroupRules)
	profiles.Delete("/:id/rules/:ruleId", permMW.RequirePermission(constants.RelationCanEdit, constants.FGAObjectFirewall), profileH.DeleteRuleFromGroup)
	profiles.Post("/:id/apply", permMW.RequirePermission(constants.RelationCanAdmin, constants.FGAObjectFirewall), profileH.ApplySecurityGroup)

	// Users (admin only)
	users := protected.Group("/users")
	users.Get("/me", userH.GetCurrentUser)
	users.Get("/members", permMW.RequirePermission(constants.RelationCanAdmin, constants.FGAObjectSystem), userH.ListMembers)
	users.Get("/invitations", permMW.RequirePermission(constants.RelationCanAdmin, constants.FGAObjectSystem), userH.ListInvitations)
	users.Post("/invite", permMW.RequirePermission(constants.RelationCanAdmin, constants.FGAObjectSystem), userH.InviteUser)

	// Audit logs (viewer+)
	logs := protected.Group("/logs")
	logs.Get("/audit", permMW.RequirePermission(constants.RelationCanView, constants.FGAObjectSystem), logsH.ListAuditLogs)

	// Immutable ports (admin only)
	ports := protected.Group("/ports")
	ports.Get("/", portsH.ListPorts)
	ports.Post("/", permMW.RequirePermission(constants.RelationCanAdmin, constants.FGAObjectSystem), portsH.AddPort)
	ports.Delete("/:id", permMW.RequirePermission(constants.RelationCanAdmin, constants.FGAObjectSystem), portsH.DeletePort)

	// WebSocket (authenticated via query param token)
	app.Use("/ws", ws.UpgradeMiddleware(deps.Auth))
	app.Get("/ws", ws.Handler(deps.Hub))

	// Serve frontend static files (built React app from ./web/dist)
	app.Static("/", "./web/dist", fiber.Static{
		Index:    "index.html",
		Compress: true,
	})

	// SPA fallback — unmatched routes serve index.html for React Router
	app.Get("/*", func(c *fiber.Ctx) error {
		if file, err := os.Stat("./web/index.html"); err == nil && !file.IsDir() {
			return c.SendFile("./web/index.html")
		}
		return c.Status(fiber.StatusNotFound).SendString("Not Found")
	})

	return app
}
