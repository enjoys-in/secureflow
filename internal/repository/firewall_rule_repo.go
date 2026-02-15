package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/enjoys-in/secureflow/internal/db"
)

// FirewallRuleRepository defines the interface for firewall rule data access.
type FirewallRuleRepository interface {
	Repository[db.FirewallRule]
	FindBySecurityGroup(ctx context.Context, sgID string) ([]db.FirewallRule, error)
	FindAllWithDetails(ctx context.Context, limit, offset int) ([]db.FirewallRuleWithDetails, error)
	DeleteNonImmutable(ctx context.Context, id string) error
}

// firewallRuleRepo is the Postgres implementation.
type firewallRuleRepo struct {
	BasePostgresRepo
}

// NewFirewallRuleRepository creates a new FirewallRuleRepository.
func NewFirewallRuleRepository(conn *sql.DB) FirewallRuleRepository {
	return &firewallRuleRepo{BasePostgresRepo{DB: conn}}
}

var firewallRuleCols = `id, COALESCE(security_group_id::text, '') AS security_group_id, direction, protocol, port, port_range_end, source_cidr, COALESCE(dest_cidr, '') AS dest_cidr, action, COALESCE(description, '') AS description, is_immutable, COALESCE(created_by::text, '') AS created_by, created_at`

func scanFirewallRule(scanner interface{ Scan(...interface{}) error }) (*db.FirewallRule, error) {
	r := &db.FirewallRule{}
	err := scanner.Scan(&r.ID, &r.SecurityGroupID, &r.Direction, &r.Protocol, &r.Port,
		&r.PortRangeEnd, &r.SourceCIDR, &r.DestCIDR, &r.Action, &r.Description,
		&r.IsImmutable, &r.CreatedBy, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (r *firewallRuleRepo) FindByID(ctx context.Context, id string) (*db.FirewallRule, error) {
	query := fmt.Sprintf(`SELECT %s FROM firewall_rules WHERE id = $1`, firewallRuleCols)
	return scanFirewallRule(r.QueryRowContext(ctx, query, id))
}

func (r *firewallRuleRepo) FindOne(ctx context.Context, filter map[string]interface{}) (*db.FirewallRule, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`SELECT %s FROM firewall_rules %s LIMIT 1`, firewallRuleCols, where)
	return scanFirewallRule(r.QueryRowContext(ctx, query, args...))
}

func (r *firewallRuleRepo) FindAll(ctx context.Context, filter map[string]interface{}, limit, offset int) ([]db.FirewallRule, error) {
	where, args := BuildWhereClause(filter, 1)
	nextParam := len(args) + 1
	query := fmt.Sprintf(`SELECT %s FROM firewall_rules %s ORDER BY created_at LIMIT $%d OFFSET $%d`, firewallRuleCols, where, nextParam, nextParam+1)
	args = append(args, limit, offset)

	rows, err := r.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []db.FirewallRule
	for rows.Next() {
		rule, err := scanFirewallRule(rows)
		if err != nil {
			return nil, err
		}
		rules = append(rules, *rule)
	}
	return rules, rows.Err()
}

func (r *firewallRuleRepo) FindBySecurityGroup(ctx context.Context, sgID string) ([]db.FirewallRule, error) {
	query := fmt.Sprintf(`SELECT %s FROM firewall_rules WHERE security_group_id = $1 ORDER BY created_at`, firewallRuleCols)
	rows, err := r.QueryContext(ctx, query, sgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []db.FirewallRule
	for rows.Next() {
		rule, err := scanFirewallRule(rows)
		if err != nil {
			return nil, err
		}
		rules = append(rules, *rule)
	}
	return rules, rows.Err()
}

func (r *firewallRuleRepo) FindAllWithDetails(ctx context.Context, limit, offset int) ([]db.FirewallRuleWithDetails, error) {
	query := `SELECT fr.id, COALESCE(fr.security_group_id::text, '') AS security_group_id,
		fr.direction, fr.protocol, fr.port, fr.port_range_end,
		fr.source_cidr, COALESCE(fr.dest_cidr, '') AS dest_cidr,
		fr.action, COALESCE(fr.description, '') AS description,
		fr.is_immutable, COALESCE(fr.created_by::text, '') AS created_by, fr.created_at,
		COALESCE(sg.name, '') AS security_group_name,
		COALESCE(u.name, '') AS created_by_name,
		COALESCE(u.email, '') AS created_by_email
		FROM firewall_rules fr
		LEFT JOIN security_groups sg ON fr.security_group_id = sg.id
		LEFT JOIN users u ON fr.created_by = u.id
		ORDER BY fr.created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []db.FirewallRuleWithDetails
	for rows.Next() {
		var rd db.FirewallRuleWithDetails
		if err := rows.Scan(
			&rd.ID, &rd.SecurityGroupID, &rd.Direction, &rd.Protocol, &rd.Port, &rd.PortRangeEnd,
			&rd.SourceCIDR, &rd.DestCIDR, &rd.Action, &rd.Description, &rd.IsImmutable, &rd.CreatedBy, &rd.CreatedAt,
			&rd.SecurityGroupName, &rd.CreatedByName, &rd.CreatedByEmail,
		); err != nil {
			return nil, err
		}
		rules = append(rules, rd)
	}
	return rules, rows.Err()
}

func (r *firewallRuleRepo) Create(ctx context.Context, rule *db.FirewallRule) error {
	return r.QueryRowContext(ctx,
		`INSERT INTO firewall_rules (security_group_id, direction, protocol, port, port_range_end, source_cidr, dest_cidr, action, description, is_immutable, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, created_at`,
		rule.SecurityGroupID, rule.Direction, rule.Protocol, rule.Port, rule.PortRangeEnd,
		rule.SourceCIDR, rule.DestCIDR, rule.Action, rule.Description, rule.IsImmutable, rule.CreatedBy,
	).Scan(&rule.ID, &rule.CreatedAt)
}

func (r *firewallRuleRepo) FindByIDAndUpdate(ctx context.Context, id string, updates map[string]interface{}) (*db.FirewallRule, error) {
	setClause, args := BuildUpdateSet(updates, 1)
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE firewall_rules %s WHERE id = $%d RETURNING %s`, setClause, len(args), firewallRuleCols)
	return scanFirewallRule(r.QueryRowContext(ctx, query, args...))
}

func (r *firewallRuleRepo) FindAndUpdate(ctx context.Context, filter map[string]interface{}, updates map[string]interface{}) (*db.FirewallRule, error) {
	setClause, setArgs := BuildUpdateSet(updates, 1)
	whereClause, whereArgs := BuildWhereClause(filter, len(setArgs)+1)
	args := append(setArgs, whereArgs...)
	query := fmt.Sprintf(`UPDATE firewall_rules %s %s RETURNING %s`, setClause, whereClause, firewallRuleCols)
	return scanFirewallRule(r.QueryRowContext(ctx, query, args...))
}

func (r *firewallRuleRepo) DeleteOne(ctx context.Context, id string) error {
	_, err := r.ExecContext(ctx, `DELETE FROM firewall_rules WHERE id = $1`, id)
	return err
}

func (r *firewallRuleRepo) DeleteNonImmutable(ctx context.Context, id string) error {
	_, err := r.ExecContext(ctx, `DELETE FROM firewall_rules WHERE id = $1 AND is_immutable = FALSE`, id)
	return err
}

func (r *firewallRuleRepo) DeleteMany(ctx context.Context, filter map[string]interface{}) (int64, error) {
	where, args := BuildWhereClause(filter, 1)
	query := fmt.Sprintf(`DELETE FROM firewall_rules %s`, where)
	res, err := r.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
