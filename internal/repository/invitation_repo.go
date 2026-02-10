package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/enjoys-in/secureflow/internal/db"
)

// InvitationRepository defines the interface for invitation data access.
type InvitationRepository interface {
	Create(ctx context.Context, inv *db.Invitation) error
	FindByToken(ctx context.Context, token string) (*db.Invitation, error)
	Accept(ctx context.Context, id string) error
}

type invitationRepo struct {
	BasePostgresRepo
}

// NewInvitationRepository creates a new InvitationRepository.
func NewInvitationRepository(conn *sql.DB) InvitationRepository {
	return &invitationRepo{BasePostgresRepo{DB: conn}}
}

func (r *invitationRepo) Create(ctx context.Context, inv *db.Invitation) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO invitations (email, role, invited_by, token, expires_at) VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		inv.Email, inv.Role, inv.InvitedBy, inv.Token, inv.ExpiresAt,
	).Scan(&inv.ID, &inv.CreatedAt)
}

func (r *invitationRepo) FindByToken(ctx context.Context, token string) (*db.Invitation, error) {
	inv := &db.Invitation{}
	err := r.QueryRowContext(ctx,
		`SELECT id, email, role, invited_by, token, expires_at, accepted_at, created_at FROM invitations WHERE token = $1 AND expires_at > $2`,
		token, time.Now(),
	).Scan(&inv.ID, &inv.Email, &inv.Role, &inv.InvitedBy, &inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return inv, nil
}

func (r *invitationRepo) Accept(ctx context.Context, id string) error {
	_, err := r.ExecContext(ctx, `UPDATE invitations SET accepted_at = NOW() WHERE id = $1`, id)
	return err
}

// --- Server Repository ---

// ServerRepository defines the interface for server data access.
type ServerRepository interface {
	Repository[db.Server]
}

type serverRepo struct {
	BasePostgresRepo
}

// NewServerRepository creates a new ServerRepository.
func NewServerRepository(conn *sql.DB) ServerRepository {
	return &serverRepo{BasePostgresRepo{DB: conn}}
}

var serverCols = `id, name, ip_address, description, created_by, created_at, updated_at`

func scanServer(scanner interface{ Scan(...interface{}) error }) (*db.Server, error) {
	s := &db.Server{}
	err := scanner.Scan(&s.ID, &s.Name, &s.IPAddress, &s.Description, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *serverRepo) FindByID(ctx context.Context, id string) (*db.Server, error) {
	query := fmt.Sprintf(`SELECT %s FROM servers WHERE id = $1`, serverCols)
	return scanServer(r.QueryRowContext(ctx, query, id))
}

func (r *serverRepo) FindOne(ctx context.Context, filter map[string]interface{}) (*db.Server, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`SELECT %s FROM servers %s LIMIT 1`, serverCols, where)
	return scanServer(r.QueryRowContext(ctx, query, args...))
}

func (r *serverRepo) FindAll(ctx context.Context, filter map[string]interface{}, limit, offset int) ([]db.Server, error) {
	where, args := BuildWhereClause(filter, 1)
	nextParam := len(args) + 1
	query := fmt.Sprintf(`SELECT %s FROM servers %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, serverCols, where, nextParam, nextParam+1)
	args = append(args, limit, offset)

	rows, err := r.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []db.Server
	for rows.Next() {
		s, err := scanServer(rows)
		if err != nil {
			return nil, err
		}
		servers = append(servers, *s)
	}
	return servers, rows.Err()
}

func (r *serverRepo) Create(ctx context.Context, s *db.Server) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO servers (name, ip_address, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id, created_at, updated_at`,
		s.Name, s.IPAddress, s.Description, s.CreatedBy,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *serverRepo) FindByIDAndUpdate(ctx context.Context, id string, updates map[string]interface{}) (*db.Server, error) {
	setClause, args := BuildUpdateSet(updates, 1)
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE servers %s, updated_at = NOW() WHERE id = $%d RETURNING %s`, setClause, len(args), serverCols)
	return scanServer(r.QueryRowContext(ctx, query, args...))
}

func (r *serverRepo) FindAndUpdate(ctx context.Context, filter map[string]interface{}, updates map[string]interface{}) (*db.Server, error) {
	setClause, setArgs := BuildUpdateSet(updates, 1)
	whereClause, whereArgs := BuildWhereClause(filter, len(setArgs)+1)
	args := append(setArgs, whereArgs...)
	query := fmt.Sprintf(`UPDATE servers %s, updated_at = NOW() %s RETURNING %s`, setClause, whereClause, serverCols)
	return scanServer(r.QueryRowContext(ctx, query, args...))
}

func (r *serverRepo) DeleteOne(ctx context.Context, id string) error {
	_, err := r.ExecContext(ctx, `DELETE FROM servers WHERE id = $1`, id)
	return err
}

func (r *serverRepo) DeleteMany(ctx context.Context, filter map[string]interface{}) (int64, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`DELETE FROM servers %s`, where)
	res, err := r.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
