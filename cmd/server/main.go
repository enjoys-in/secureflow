package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/enjoys-in/secureflow/internal/api"
	"github.com/enjoys-in/secureflow/internal/config"
	"github.com/enjoys-in/secureflow/internal/constants"
	"github.com/enjoys-in/secureflow/internal/db"
	"github.com/enjoys-in/secureflow/internal/fga"
	"github.com/enjoys-in/secureflow/internal/firewall"
	"github.com/enjoys-in/secureflow/internal/realtime"
	"github.com/enjoys-in/secureflow/internal/repository"
	"github.com/enjoys-in/secureflow/internal/security"
	"github.com/enjoys-in/secureflow/internal/websocket"
	"github.com/enjoys-in/secureflow/pkg/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	appLogger, err := logger.New(cfg.LogLevel, cfg.LogFormat)
	if err != nil {
		log.Fatalf("Failed to init logger: %v", err)
	}
	defer appLogger.Sync()

	appLogger.Info("Starting Firewall Manager...")

	// Connect to PostgreSQL
	conn, err := db.Connect(cfg.PostgresDSN)
	if err != nil {
		appLogger.Fatal("Failed to connect to database", "error", err)
	}
	defer conn.Close()

	// Run SQL file-based migrations
	migrator := db.NewMigrator(conn, "migrations", appLogger)
	if err := migrator.Up(context.Background()); err != nil {
		appLogger.Fatal("Failed to run migrations", "error", err)
	}
	appLogger.Info("Database migrations completed")

	// Initialize repositories
	userRepo := repository.NewUserRepository(conn)
	ruleRepo := repository.NewFirewallRuleRepository(conn)
	sgRepo := repository.NewSecurityGroupRepository(conn)
	auditRepo := repository.NewAuditLogRepository(conn)
	invRepo := repository.NewInvitationRepository(conn)
	portRepo := repository.NewImmutablePortRepository(conn)
	blockedIPRepo := repository.NewBlockedIPRepository(conn)

	// Seed default immutable ports
	if err := repository.SeedDefaultPorts(context.Background(), portRepo, constants.DefaultImmutablePorts, constants.ServicePortNames); err != nil {
		appLogger.Fatal("Failed to seed default ports", "error", err)
	}
	appLogger.Info("Immutable ports seeded")

	// Load all immutable ports from DB for firewall manager
	allPorts, err := portRepo.GetAllPorts(context.Background())
	if err != nil {
		appLogger.Fatal("Failed to load immutable ports", "error", err)
	}

	// Initialize OpenFGA client and bootstrap
	fgaClient := fga.NewClient(cfg.OpenFGAEndpoint)
	if err := fga.Bootstrap(context.Background(), fgaClient, cfg.OpenFGAStoreID, appLogger); err != nil {
		appLogger.Error("OpenFGA bootstrap failed (auth checks may not work)", "error", err)
		// Non-fatal: continue so the app still starts with degraded auth
	}

	// Initialize auth service (uses repos + FGA)
	authService := security.NewAuthService(cfg.JWTSecret, cfg.MasterPassword, userRepo, fgaClient)

	// Initialize firewall manager with DB-driven immutable ports
	fwManager, err := firewall.NewManager(cfg.FirewallBackend, allPorts, appLogger)
	if err != nil {
		appLogger.Fatal("Failed to init firewall manager", "error", err)
	}

	// Ensure immutable ports are open on startup
	if err := fwManager.EnsureImmutablePorts(); err != nil {
		appLogger.Fatal("Failed to ensure immutable ports", "error", err)
	}
	appLogger.Info("Immutable ports enforced", "count", len(allPorts))

	// Import pre-existing kernel rules (e.g., iptables rules added before this server)
	importedRules, err := fwManager.ImportExistingRules()
	if err != nil {
		appLogger.Error("Failed to import existing kernel rules", "error", err)
	} else if len(importedRules) > 0 {
		appLogger.Info("Importing pre-existing kernel rules", "count", len(importedRules))
		for _, rule := range importedRules {
			dbRule := &db.FirewallRule{
				Direction:    rule.Direction,
				Protocol:     rule.Protocol,
				Port:         rule.Port,
				PortRangeEnd: rule.PortEnd,
				SourceCIDR:   rule.SourceCIDR,
				DestCIDR:     rule.DestCIDR,
				Action:       rule.Action,
				Description:  "Imported from existing kernel rules",
				IsImmutable:  false,
			}
			if err := ruleRepo.Create(context.Background(), dbRule); err != nil {
				appLogger.Warn("Failed to save imported rule to database", "error", err)
			}
		}
		appLogger.Info("Pre-existing rules imported to database", "count", len(importedRules))
	}

	// Sync all DB rules to the firewall kernel (restores rules after server restart)
	allDBRules, err := ruleRepo.FindAll(context.Background(), nil, 10000, 0)
	if err != nil {
		appLogger.Error("Failed to load rules from database for sync", "error", err)
	} else if len(allDBRules) > 0 {
		var fwRules []firewall.Rule
		for _, r := range allDBRules {
			fwRules = append(fwRules, firewall.Rule{
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
		if err := fwManager.SyncDBRules(fwRules); err != nil {
			appLogger.Error("Failed to sync DB rules to firewall", "error", err)
		}
		appLogger.Info("Firewall rules synced from database", "count", len(fwRules))
	}

	// Initialize WebSocket hub
	hub := websocket.NewHub(appLogger)
	go hub.Run()

	// Setup live traffic monitoring (NFLOG → WebSocket)
	if err := fwManager.SetupTrafficMonitoring(realtime.NFLOGGroup); err != nil {
		appLogger.Error("Failed to setup NFLOG rules (live traffic may not work)", "error", err)
	}

	trafficMonitor := realtime.NewNFLOGMonitor(appLogger)
	trafficBridge := realtime.NewBridge(trafficMonitor, hub, appLogger)
	trafficCtx, trafficCancel := context.WithCancel(context.Background())
	go func() {
		if err := trafficBridge.Run(trafficCtx); err != nil && trafficCtx.Err() == nil {
			appLogger.Error("Traffic monitor error", "error", err)
		}
	}()

	// Setup and start API server
	server := api.NewServer(api.ServerDeps{
		Config:            cfg,
		Logger:            appLogger,
		DB:                conn,
		Auth:              authService,
		FGA:               fgaClient,
		Firewall:          fwManager,
		Hub:               hub,
		UserRepo:          userRepo,
		FirewallRuleRepo:  ruleRepo,
		SecurityGroupRepo: sgRepo,
		AuditLogRepo:      auditRepo,
		InvitationRepo:    invRepo,
		ImmutablePortRepo: portRepo,
		BlockedIPRepo:     blockedIPRepo,
	})

	// Graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		addr := fmt.Sprintf(":%d", cfg.Port)
		appLogger.Info("Server listening", "address", addr, "tls", cfg.TLSEnabled)
		if cfg.TLSEnabled {
			if err := server.ListenTLS(addr, cfg.TLSCertFile, cfg.TLSKeyFile); err != nil {
				appLogger.Fatal("Server failed", "error", err)
			}
		} else {
			if err := server.Listen(addr); err != nil {
				appLogger.Fatal("Server failed", "error", err)
			}
		}
	}()

	<-ctx.Done()
	appLogger.Info("Shutting down gracefully...")
	trafficCancel() // stop traffic monitor
	hub.Shutdown()
	if err := server.Shutdown(); err != nil {
		appLogger.Error("Server shutdown error", "error", err)
	}
	appLogger.Info("Server stopped")
}
