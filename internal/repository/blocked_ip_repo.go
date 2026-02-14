package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/enjoys-in/secureflow/internal/db"
)

// BlockedIPRepository defines the interface for blocked IP data access.
type BlockedIPRepository interface {
	Create(ctx context.Context, entry *db.BlockedIP) error
	FindAll(ctx context.Context, status string, limit, offset int) ([]db.BlockedIPWithUser, error)
	FindByIP(ctx context.Context, ip string) (*db.BlockedIP, error)
	Unblock(ctx context.Context, id string, unblockedBy string) error
	Reblock(ctx context.Context, id string) error
	BulkCreate(ctx context.Context, entries []db.BlockedIP) (int, error)
	BulkUnblock(ctx context.Context, ips []string, unblockedBy string) (int, error)
	Count(ctx context.Context, status string) (int, error)
}

type blockedIPRepo struct {
	BasePostgresRepo
}

// NewBlockedIPRepository creates a new BlockedIPRepository.
func NewBlockedIPRepository(conn *sql.DB) BlockedIPRepository {
	return &blockedIPRepo{BasePostgresRepo{DB: conn}}
}

func (r *blockedIPRepo) Create(ctx context.Context, entry *db.BlockedIP) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO blocked_ips (ip, reason, status, blocked_by, blocked_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at`,
		entry.IP, entry.Reason, "blocked", entry.BlockedBy, time.Now(),
	).Scan(&entry.ID, &entry.CreatedAt)
}

func (r *blockedIPRepo) FindAll(ctx context.Context, status string, limit, offset int) ([]db.BlockedIPWithUser, error) {
	query := `
		SELECT b.id, b.ip, b.reason, b.status, b.blocked_by, b.unblocked_by,
		       b.blocked_at, b.unblocked_at, b.created_at,
		       COALESCE(ub.name, '') AS blocked_by_name,
		       COALESCE(ub.email, '') AS blocked_by_email,
		       COALESCE(uu.name, '') AS unblocked_by_name,
		       COALESCE(uu.email, '') AS unblocked_by_email
		FROM blocked_ips b
		LEFT JOIN users ub ON b.blocked_by = ub.id::text
		LEFT JOIN users uu ON b.unblocked_by = uu.id::text
	`
	args := []interface{}{}
	paramIdx := 1

	if status != "" && status != "all" {
		query += fmt.Sprintf(` WHERE b.status = $%d`, paramIdx)
		args = append(args, status)
		paramIdx++
	}

	query += fmt.Sprintf(` ORDER BY b.blocked_at DESC LIMIT $%d OFFSET $%d`, paramIdx, paramIdx+1)
	args = append(args, limit, offset)

	rows, err := r.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []db.BlockedIPWithUser
	for rows.Next() {
		var e db.BlockedIPWithUser
		if err := rows.Scan(
			&e.ID, &e.IP, &e.Reason, &e.Status, &e.BlockedBy, &e.UnblockedBy,
			&e.BlockedAt, &e.UnblockedAt, &e.CreatedAt,
			&e.BlockedByName, &e.BlockedByEmail, &e.UnblockedByName, &e.UnblockedByEmail,
		); err != nil {
			return nil, err
		}
		results = append(results, e)
	}
	return results, rows.Err()
}

func (r *blockedIPRepo) FindByIP(ctx context.Context, ip string) (*db.BlockedIP, error) {
	e := &db.BlockedIP{}
	err := r.QueryRowContext(ctx,
		`SELECT id, ip, reason, status, blocked_by, unblocked_by, blocked_at, unblocked_at, created_at
		 FROM blocked_ips WHERE ip = $1 AND status = 'blocked' LIMIT 1`,
		ip,
	).Scan(&e.ID, &e.IP, &e.Reason, &e.Status, &e.BlockedBy, &e.UnblockedBy, &e.BlockedAt, &e.UnblockedAt, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *blockedIPRepo) Unblock(ctx context.Context, id string, unblockedBy string) error {
	_, err := r.ExecContext(ctx,
		`UPDATE blocked_ips SET status = 'unblocked', unblocked_by = $2, unblocked_at = $3 WHERE id = $1 AND status = 'blocked'`,
		id, unblockedBy, time.Now(),
	)
	return err
}

func (r *blockedIPRepo) Reblock(ctx context.Context, id string) error {
	_, err := r.ExecContext(ctx,
		`UPDATE blocked_ips SET status = 'blocked', unblocked_by = NULL, unblocked_at = NULL WHERE id = $1`,
		id,
	)
	return err
}

func (r *blockedIPRepo) BulkCreate(ctx context.Context, entries []db.BlockedIP) (int, error) {
	created := 0
	for _, entry := range entries {
		e := entry
		// Skip if already blocked
		existing, _ := r.FindByIP(ctx, e.IP)
		if existing != nil {
			continue
		}
		if err := r.Create(ctx, &e); err != nil {
			continue
		}
		created++
	}
	return created, nil
}

func (r *blockedIPRepo) BulkUnblock(ctx context.Context, ips []string, unblockedBy string) (int, error) {
	unblocked := 0
	for _, ip := range ips {
		existing, err := r.FindByIP(ctx, ip)
		if err != nil || existing == nil {
			continue
		}
		if err := r.Unblock(ctx, existing.ID, unblockedBy); err != nil {
			continue
		}
		unblocked++
	}
	return unblocked, nil
}

func (r *blockedIPRepo) Count(ctx context.Context, status string) (int, error) {
	query := `SELECT COUNT(*) FROM blocked_ips`
	args := []interface{}{}
	if status != "" && status != "all" {
		query += ` WHERE status = $1`
		args = append(args, status)
	}
	var count int
	err := r.QueryRowContext(ctx, query, args...).Scan(&count)
	return count, err
}
