package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/enjoys-in/secureflow/internal/db"
)

// ImmutablePortRepository defines the interface for immutable port data access.
type ImmutablePortRepository interface {
	Create(ctx context.Context, port *db.ImmutablePort) error
	FindAll(ctx context.Context) ([]db.ImmutablePort, error)
	FindByPort(ctx context.Context, port int, protocol string) (*db.ImmutablePort, error)
	DeleteOne(ctx context.Context, id string) error
	GetAllPorts(ctx context.Context) ([]int, error)
}

type immutablePortRepo struct {
	BasePostgresRepo
}

// NewImmutablePortRepository creates a new ImmutablePortRepository.
func NewImmutablePortRepository(conn *sql.DB) ImmutablePortRepository {
	return &immutablePortRepo{BasePostgresRepo{DB: conn}}
}

func (r *immutablePortRepo) Create(ctx context.Context, port *db.ImmutablePort) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO immutable_ports (port, protocol, service_name, is_default, added_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		port.Port, port.Protocol, port.ServiceName, port.IsDefault, port.AddedBy,
	).Scan(&port.ID, &port.CreatedAt)
}

func (r *immutablePortRepo) FindAll(ctx context.Context) ([]db.ImmutablePort, error) {
	rows, err := r.QueryContext(ctx,
		`SELECT id, port, protocol, service_name, is_default, added_by, created_at FROM immutable_ports ORDER BY port ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ports []db.ImmutablePort
	for rows.Next() {
		var p db.ImmutablePort
		if err := rows.Scan(&p.ID, &p.Port, &p.Protocol, &p.ServiceName, &p.IsDefault, &p.AddedBy, &p.CreatedAt); err != nil {
			return nil, err
		}
		ports = append(ports, p)
	}
	return ports, rows.Err()
}

func (r *immutablePortRepo) FindByPort(ctx context.Context, port int, protocol string) (*db.ImmutablePort, error) {
	p := &db.ImmutablePort{}
	err := r.QueryRowContext(ctx,
		`SELECT id, port, protocol, service_name, is_default, added_by, created_at FROM immutable_ports WHERE port = $1 AND protocol = $2`,
		port, protocol,
	).Scan(&p.ID, &p.Port, &p.Protocol, &p.ServiceName, &p.IsDefault, &p.AddedBy, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// DeleteOne deletes an immutable port by ID. Returns error if the port is a default.
func (r *immutablePortRepo) DeleteOne(ctx context.Context, id string) error {
	// Check if it's a default port first
	var isDefault bool
	err := r.QueryRowContext(ctx, `SELECT is_default FROM immutable_ports WHERE id = $1`, id).Scan(&isDefault)
	if err != nil {
		return fmt.Errorf("port not found: %w", err)
	}
	if isDefault {
		return fmt.Errorf("default immutable ports cannot be deleted")
	}

	_, err = r.ExecContext(ctx, `DELETE FROM immutable_ports WHERE id = $1 AND is_default = FALSE`, id)
	return err
}

func (r *immutablePortRepo) GetAllPorts(ctx context.Context) ([]int, error) {
	rows, err := r.QueryContext(ctx, `SELECT DISTINCT port FROM immutable_ports ORDER BY port ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ports []int
	for rows.Next() {
		var p int
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		ports = append(ports, p)
	}
	return ports, rows.Err()
}

// SeedDefaultPorts inserts the default immutable ports if they don't exist.
func SeedDefaultPorts(ctx context.Context, repo ImmutablePortRepository, defaults []int, serviceNames map[int]string) error {
	for _, port := range defaults {
		existing, _ := repo.FindByPort(ctx, port, "tcp")
		if existing != nil {
			continue
		}

		serviceName := serviceNames[port]
		if serviceName == "" {
			serviceName = fmt.Sprintf("port-%d", port)
		}

		p := &db.ImmutablePort{
			Port:        port,
			Protocol:    "tcp",
			ServiceName: serviceName,
			IsDefault:   true,
			AddedBy:     nil,
			CreatedAt:   time.Now(),
		}
		if err := repo.Create(ctx, p); err != nil {
			return fmt.Errorf("seed port %d: %w", port, err)
		}
	}
	return nil
}
