package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// BasePostgresRepo provides shared helpers for all Postgres-backed repositories.
type BasePostgresRepo struct {
	DB *sql.DB
}

// ExecContext executes a query that doesn't return rows.
func (b *BasePostgresRepo) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	return b.DB.ExecContext(ctx, query, args...)
}

// QueryRowContext executes a query that returns at most one row.
func (b *BasePostgresRepo) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	return b.DB.QueryRowContext(ctx, query, args...)
}

// QueryContext executes a query that returns rows.
func (b *BasePostgresRepo) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	return b.DB.QueryContext(ctx, query, args...)
}

// BuildWhereClause constructs a WHERE clause from a filter map.
// Returns the clause string (e.g. "WHERE col1 = $1 AND col2 = $2") and the args slice.
func BuildWhereClause(filter map[string]interface{}, startParam int) (string, []interface{}) {
	if len(filter) == 0 {
		return "", nil
	}

	clauses := make([]string, 0, len(filter))
	args := make([]interface{}, 0, len(filter))
	i := startParam

	for col, val := range filter {
		clauses = append(clauses, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}

	return "WHERE " + strings.Join(clauses, " AND "), args
}

// BuildUpdateSet constructs the SET clause for an UPDATE statement.
// Returns "SET col1 = $1, col2 = $2" and args slice.
func BuildUpdateSet(updates map[string]interface{}, startParam int) (string, []interface{}) {
	if len(updates) == 0 {
		return "", nil
	}

	setClauses := make([]string, 0, len(updates))
	args := make([]interface{}, 0, len(updates))
	i := startParam

	for col, val := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}

	return "SET " + strings.Join(setClauses, ", "), args
}
