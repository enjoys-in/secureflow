package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/enjoys-in/secureflow/internal/db"
)

// UserRepository defines the interface for user data access.
type UserRepository interface {
	Repository[db.User]
	FindByEmail(ctx context.Context, email string) (*db.User, error)
}

// userRepo is the Postgres implementation of UserRepository.
type userRepo struct {
	BasePostgresRepo
}

// NewUserRepository creates a new UserRepository backed by Postgres.
func NewUserRepository(conn *sql.DB) UserRepository {
	return &userRepo{BasePostgresRepo{DB: conn}}
}

func (r *userRepo) FindByID(ctx context.Context, id string) (*db.User, error) {
	u := &db.User{}
	err := r.QueryRowContext(ctx,
		`SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*db.User, error) {
	u := &db.User{}
	err := r.QueryRowContext(ctx,
		`SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *userRepo) FindOne(ctx context.Context, filter map[string]interface{}) (*db.User, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`SELECT id, email, name, password_hash, created_at, updated_at FROM users %s LIMIT 1`, where)
	u := &db.User{}
	err := r.QueryRowContext(ctx, query, args...).Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *userRepo) FindAll(ctx context.Context, filter map[string]interface{}, limit, offset int) ([]db.User, error) {
	where, args := BuildWhereClause(filter, 1)
	nextParam := len(args) + 1
	query := fmt.Sprintf(`SELECT id, email, name, password_hash, created_at, updated_at FROM users %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, nextParam, nextParam+1)
	args = append(args, limit, offset)

	rows, err := r.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []db.User
	for rows.Next() {
		var u db.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *userRepo) Create(ctx context.Context, u *db.User) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at`,
		u.Email, u.Name, u.PasswordHash,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
}

func (r *userRepo) FindByIDAndUpdate(ctx context.Context, id string, updates map[string]interface{}) (*db.User, error) {
	setClause, args := BuildUpdateSet(updates, 1)
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE users %s, updated_at = NOW() WHERE id = $%d RETURNING id, email, name, password_hash, created_at, updated_at`, setClause, len(args))

	u := &db.User{}
	err := r.QueryRowContext(ctx, query, args...).Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *userRepo) FindAndUpdate(ctx context.Context, filter map[string]interface{}, updates map[string]interface{}) (*db.User, error) {
	setClause, setArgs := BuildUpdateSet(updates, 1)
	whereClause, whereArgs := BuildWhereClause(filter, len(setArgs)+1)
	args := append(setArgs, whereArgs...)
	query := fmt.Sprintf(`UPDATE users %s, updated_at = NOW() %s RETURNING id, email, name, password_hash, created_at, updated_at`, setClause, whereClause)

	u := &db.User{}
	err := r.QueryRowContext(ctx, query, args...).Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *userRepo) DeleteOne(ctx context.Context, id string) error {
	_, err := r.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}

func (r *userRepo) DeleteMany(ctx context.Context, filter map[string]interface{}) (int64, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`DELETE FROM users %s`, where)
	res, err := r.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
