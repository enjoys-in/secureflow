#!/bin/bash
set -euo pipefail

echo "=== Database Migration ==="

POSTGRES_DSN="${POSTGRES_DSN:-postgres://fm_user:fm_password@localhost:5432/firewall_manager?sslmode=disable}"

echo "Connecting to: $POSTGRES_DSN"
echo "Migrations are handled automatically by the Go application on startup."
echo ""
echo "To manually connect to the database:"
echo "  psql \"$POSTGRES_DSN\""
echo ""
echo "To reset the database:"
echo "  docker compose down -v"
echo "  docker compose up -d"
