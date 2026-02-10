package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/enjoys-in/secureflow/internal/db"
)

// SecurityGroupRepository defines the interface for security group data access.
type SecurityGroupRepository interface {
	Repository[db.SecurityGroup]
	AttachToServer(ctx context.Context, serverID, sgID, userID string) error
	DetachFromServer(ctx context.Context, serverID, sgID string) error
	ListByServer(ctx context.Context, serverID string) ([]db.SecurityGroup, error)
}

type securityGroupRepo struct {
	BasePostgresRepo
}

// NewSecurityGroupRepository creates a new SecurityGroupRepository.
func NewSecurityGroupRepository(conn *sql.DB) SecurityGroupRepository {
	return &securityGroupRepo{BasePostgresRepo{DB: conn}}
}

var sgCols = `id, name, description, created_by, created_at, updated_at`

func scanSecurityGroup(scanner interface{ Scan(...interface{}) error }) (*db.SecurityGroup, error) {
	sg := &db.SecurityGroup{}
	err := scanner.Scan(&sg.ID, &sg.Name, &sg.Description, &sg.CreatedBy, &sg.CreatedAt, &sg.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return sg, nil
}

func (r *securityGroupRepo) FindByID(ctx context.Context, id string) (*db.SecurityGroup, error) {
	query := fmt.Sprintf(`SELECT %s FROM security_groups WHERE id = $1`, sgCols)
	return scanSecurityGroup(r.QueryRowContext(ctx, query, id))
}

func (r *securityGroupRepo) FindOne(ctx context.Context, filter map[string]interface{}) (*db.SecurityGroup, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`SELECT %s FROM security_groups %s LIMIT 1`, sgCols, where)
	return scanSecurityGroup(r.QueryRowContext(ctx, query, args...))
}

func (r *securityGroupRepo) FindAll(ctx context.Context, filter map[string]interface{}, limit, offset int) ([]db.SecurityGroup, error) {
	where, args := BuildWhereClause(filter, 1)
	nextParam := len(args) + 1
	query := fmt.Sprintf(`SELECT %s FROM security_groups %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, sgCols, where, nextParam, nextParam+1)
	args = append(args, limit, offset)

	rows, err := r.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []db.SecurityGroup
	for rows.Next() {
		sg, err := scanSecurityGroup(rows)
		if err != nil {
			return nil, err
		}
		groups = append(groups, *sg)
	}
	return groups, rows.Err()
}

func (r *securityGroupRepo) Create(ctx context.Context, sg *db.SecurityGroup) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO security_groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at`,
		sg.Name, sg.Description, sg.CreatedBy,
	).Scan(&sg.ID, &sg.CreatedAt, &sg.UpdatedAt)
}

func (r *securityGroupRepo) FindByIDAndUpdate(ctx context.Context, id string, updates map[string]interface{}) (*db.SecurityGroup, error) {
	setClause, args := BuildUpdateSet(updates, 1)
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE security_groups %s, updated_at = NOW() WHERE id = $%d RETURNING %s`, setClause, len(args), sgCols)
	return scanSecurityGroup(r.QueryRowContext(ctx, query, args...))
}

func (r *securityGroupRepo) FindAndUpdate(ctx context.Context, filter map[string]interface{}, updates map[string]interface{}) (*db.SecurityGroup, error) {
	setClause, setArgs := BuildUpdateSet(updates, 1)
	whereClause, whereArgs := BuildWhereClause(filter, len(setArgs)+1)
	args := append(setArgs, whereArgs...)
	query := fmt.Sprintf(`UPDATE security_groups %s, updated_at = NOW() %s RETURNING %s`, setClause, whereClause, sgCols)
	return scanSecurityGroup(r.QueryRowContext(ctx, query, args...))
}

func (r *securityGroupRepo) DeleteOne(ctx context.Context, id string) error {
	_, err := r.ExecContext(ctx, `DELETE FROM security_groups WHERE id = $1`, id)
	return err
}

func (r *securityGroupRepo) DeleteMany(ctx context.Context, filter map[string]interface{}) (int64, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`DELETE FROM security_groups %s`, where)
	res, err := r.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *securityGroupRepo) AttachToServer(ctx context.Context, serverID, sgID, userID string) error {
	_, err := r.ExecContext(ctx,
		`INSERT INTO server_security_groups (server_id, security_group_id, applied_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
		serverID, sgID, userID,
	)
	return err
}

func (r *securityGroupRepo) DetachFromServer(ctx context.Context, serverID, sgID string) error {
	_, err := r.ExecContext(ctx,
		`DELETE FROM server_security_groups WHERE server_id = $1 AND security_group_id = $2`,
		serverID, sgID,
	)
	return err
}

func (r *securityGroupRepo) ListByServer(ctx context.Context, serverID string) ([]db.SecurityGroup, error) {
	query := fmt.Sprintf(`SELECT sg.%s FROM security_groups sg
		JOIN server_security_groups ssg ON sg.id = ssg.security_group_id
		WHERE ssg.server_id = $1`, sgCols)

	rows, err := r.QueryContext(ctx, query, serverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []db.SecurityGroup
	for rows.Next() {
		sg, err := scanSecurityGroup(rows)
		if err != nil {
			return nil, err
		}
		groups = append(groups, *sg)
	}
	return groups, rows.Err()
}
