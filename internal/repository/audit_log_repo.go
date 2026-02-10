package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/enjoys-in/secureflow/internal/db"
)

// AuditLogRepository defines the interface for audit log data access.
type AuditLogRepository interface {
	Create(ctx context.Context, log *db.AuditLog) error
	FindAll(ctx context.Context, filter map[string]interface{}, limit, offset int) ([]db.AuditLog, error)
	FindByUserID(ctx context.Context, userID string, limit, offset int) ([]db.AuditLog, error)
}

type auditLogRepo struct {
	BasePostgresRepo
}

// NewAuditLogRepository creates a new AuditLogRepository.
func NewAuditLogRepository(conn *sql.DB) AuditLogRepository {
	return &auditLogRepo{BasePostgresRepo{DB: conn}}
}

var auditLogCols = `id, user_id, action, resource, details, ip, timestamp`

func (r *auditLogRepo) Create(ctx context.Context, log *db.AuditLog) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO audit_logs (user_id, action, resource, details, ip) VALUES ($1,$2,$3,$4,$5) RETURNING id, timestamp`,
		log.UserID, log.Action, log.Resource, log.Details, log.IP,
	).Scan(&log.ID, &log.Timestamp)
}

func (r *auditLogRepo) FindAll(ctx context.Context, filter map[string]interface{}, limit, offset int) ([]db.AuditLog, error) {
	where, args := BuildWhereClause(filter, 1)
	nextParam := len(args) + 1
	query := fmt.Sprintf(`SELECT %s FROM audit_logs %s ORDER BY timestamp DESC LIMIT $%d OFFSET $%d`, auditLogCols, where, nextParam, nextParam+1)
	args = append(args, limit, offset)

	rows, err := r.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []db.AuditLog
	for rows.Next() {
		var l db.AuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.Resource, &l.Details, &l.IP, &l.Timestamp); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

func (r *auditLogRepo) FindByUserID(ctx context.Context, userID string, limit, offset int) ([]db.AuditLog, error) {
	return r.FindAll(ctx, map[string]interface{}{"user_id": userID}, limit, offset)
}
