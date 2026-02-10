package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/enjoys-in/secureflow/pkg/logger"
)

// Migrator handles SQL file-based database migrations.
type Migrator struct {
	db     *sql.DB
	dir    string
	logger *logger.Logger
}

// NewMigrator creates a new Migrator that reads SQL files from the given directory.
func NewMigrator(database *sql.DB, migrationsDir string, log *logger.Logger) *Migrator {
	return &Migrator{
		db:     database,
		dir:    migrationsDir,
		logger: log,
	}
}

// ensureMigrationsTable creates the schema_migrations tracking table if it doesn't exist.
func (m *Migrator) ensureMigrationsTable(ctx context.Context) error {
	_, err := m.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)
	return err
}

// isApplied checks if a migration version has already been applied.
func (m *Migrator) isApplied(ctx context.Context, version string) (bool, error) {
	var count int
	err := m.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM schema_migrations WHERE version = $1`, version).Scan(&count)
	return count > 0, err
}

// Up runs all pending up-migrations in order.
func (m *Migrator) Up(ctx context.Context) error {
	if err := m.ensureMigrationsTable(ctx); err != nil {
		return fmt.Errorf("ensure migrations table: %w", err)
	}

	files, err := m.getMigrationFiles("up")
	if err != nil {
		return err
	}

	for _, file := range files {
		version := extractVersion(file)

		applied, err := m.isApplied(ctx, version)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if applied {
			continue
		}

		content, err := os.ReadFile(filepath.Join(m.dir, file))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}

		tx, err := m.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin tx for %s: %w", file, err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("exec migration %s: %w", file, err)
		}

		if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", file, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", file, err)
		}

		m.logger.Info("Migration applied", "version", version, "file", file)
	}

	return nil
}

// Down rolls back the last applied migration.
func (m *Migrator) Down(ctx context.Context) error {
	if err := m.ensureMigrationsTable(ctx); err != nil {
		return fmt.Errorf("ensure migrations table: %w", err)
	}

	// Get the latest applied version
	var version string
	err := m.db.QueryRowContext(ctx, `SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1`).Scan(&version)
	if err != nil {
		if err == sql.ErrNoRows {
			m.logger.Info("No migrations to roll back")
			return nil
		}
		return fmt.Errorf("get latest migration: %w", err)
	}

	// Find the corresponding down file
	downFile := ""
	files, err := m.getMigrationFiles("down")
	if err != nil {
		return err
	}

	for _, f := range files {
		if extractVersion(f) == version {
			downFile = f
			break
		}
	}

	if downFile == "" {
		return fmt.Errorf("down migration not found for version %s", version)
	}

	content, err := os.ReadFile(filepath.Join(m.dir, downFile))
	if err != nil {
		return fmt.Errorf("read down migration %s: %w", downFile, err)
	}

	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx for %s: %w", downFile, err)
	}

	if _, err := tx.ExecContext(ctx, string(content)); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("exec down migration %s: %w", downFile, err)
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM schema_migrations WHERE version = $1`, version); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("remove migration record %s: %w", version, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit down migration %s: %w", downFile, err)
	}

	m.logger.Info("Migration rolled back", "version", version, "file", downFile)
	return nil
}

// getMigrationFiles returns sorted list of migration files for the given direction.
func (m *Migrator) getMigrationFiles(direction string) ([]string, error) {
	entries, err := os.ReadDir(m.dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations directory %s: %w", m.dir, err)
	}

	suffix := "." + direction + ".sql"
	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), suffix) {
			files = append(files, entry.Name())
		}
	}

	sort.Strings(files)
	return files, nil
}

// extractVersion extracts the version number from a migration filename.
// e.g., "000001_create_users.up.sql" -> "000001"
func extractVersion(filename string) string {
	parts := strings.SplitN(filename, "_", 2)
	if len(parts) > 0 {
		return parts[0]
	}
	return filename
}
