#!/bin/bash
set -euo pipefail

# ============================================================
# Local Development Setup (no docker-compose)
# ============================================================
# Prerequisites: Docker, Go 1.21+, Node.js 18+, PostgreSQL running locally
# ============================================================

# --- Configuration ---
DB_USER="${DB_USER:-fm_user}"
DB_PASSWORD="${DB_PASSWORD:-fm_password}"
DB_NAME="${DB_NAME:-firewall_manager}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
POSTGRES_DSN="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
OPENFGA_PORT="${OPENFGA_PORT:-8080}"
API_PORT="${API_PORT:-8443}"
WEB_PORT="${WEB_PORT:-5173}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

echo "========================================"
echo "  SecureFlow — Local Dev Setup"
echo "========================================"
echo ""

# --- Step 1: Check prerequisites ---
echo "--- Checking prerequisites ---"

for cmd in docker go node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd is not installed. Please install it first."
    exit 1
  fi
done
info "docker $(docker --version | awk '{print $3}' | tr -d ',')"
info "go $(go version | awk '{print $3}')"
info "node $(node --version)"
echo ""

# --- Step 2: Setup PostgreSQL database ---
echo "--- Setting up PostgreSQL ---"

# Check if PostgreSQL is reachable
if command -v psql &>/dev/null; then
  if psql "postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres?sslmode=disable" -c "SELECT 1" &>/dev/null; then
    info "PostgreSQL is reachable"

    # Create database if it doesn't exist
    DB_EXISTS=$(psql "postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres?sslmode=disable" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || true)
    if [ "$DB_EXISTS" != "1" ]; then
      psql "postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres?sslmode=disable" -c "CREATE DATABASE ${DB_NAME}" &>/dev/null
      info "Created database '${DB_NAME}'"
    else
      info "Database '${DB_NAME}' already exists"
    fi
  else
    warn "PostgreSQL is not reachable at ${DB_HOST}:${DB_PORT}"
    warn "Make sure PostgreSQL is running with user '${DB_USER}' and password '${DB_PASSWORD}'"
  fi
else
  warn "psql not found — skipping DB creation check. Make sure database '${DB_NAME}' exists."
fi
echo ""

# --- Step 3: Run OpenFGA migrations + start OpenFGA ---
echo "--- Setting up OpenFGA ---"

# Stop existing container if running
docker rm -f openfga 2>/dev/null && warn "Removed existing openfga container" || true

# Run OpenFGA migrations
info "Running OpenFGA migrations..."
docker run --rm \
  -e OPENFGA_DATASTORE_ENGINE=postgres \
  -e "OPENFGA_DATASTORE_URI=postgresql://${DB_USER}:${DB_PASSWORD}@host.docker.internal:${DB_PORT}/${DB_NAME}?sslmode=disable" \
  openfga/openfga migrate

info "OpenFGA migrations complete"

# Start OpenFGA server
info "Starting OpenFGA server on port ${OPENFGA_PORT}..."
docker run -d \
  --name openfga \
  -p "${OPENFGA_PORT}:8080" \
  -p 8081:8081 \
  -e OPENFGA_DATASTORE_ENGINE=postgres \
  -e "OPENFGA_DATASTORE_URI=postgresql://${DB_USER}:${DB_PASSWORD}@host.docker.internal:${DB_PORT}/${DB_NAME}?sslmode=disable" \
  -e OPENFGA_LOG_LEVEL=info \
  openfga/openfga run

# Wait for OpenFGA to be ready
echo -n "  Waiting for OpenFGA"
for i in $(seq 1 15); do
  if curl -s "http://localhost:${OPENFGA_PORT}/healthz" &>/dev/null; then
    echo ""
    info "OpenFGA is ready"
    break
  fi
  echo -n "."
  sleep 1
  if [ "$i" -eq 15 ]; then
    echo ""
    error "OpenFGA failed to start. Check: docker logs openfga"
    exit 1
  fi
done
echo ""

# --- Step 4: Install Go dependencies ---
echo "--- Installing Go dependencies ---"
go mod download
info "Go dependencies installed"
echo ""

# --- Step 5: Install web dependencies ---
echo "--- Installing web dependencies ---"
cd web
npm install
cd ..
info "Web dependencies installed"
echo ""

# --- Step 6: Create .env file ---
echo "--- Creating .env file ---"
if [ ! -f .env ]; then
  cat > .env <<EOF
PORT=${API_PORT}
POSTGRES_DSN=${POSTGRES_DSN}
OPENFGA_ENDPOINT=http://localhost:${OPENFGA_PORT}
OPENFGA_STORE_ID=
JWT_SECRET=local-dev-secret-change-in-prod
FIREWALL_BACKEND=iptables
LOG_LEVEL=info
LOG_FORMAT=text
TLS_ENABLED=false
ALLOW_ORIGINS=http://localhost:${WEB_PORT},http://localhost:4173
IMMUTABLE_PORTS=22,25,465,587,3306,6379
EOF
  info "Created .env file"
else
  warn ".env already exists — skipping"
fi
echo ""

# --- Done ---
echo "========================================"
echo -e "${GREEN}  Setup complete!${NC}"
echo "========================================"
echo ""
echo "  Start the API server:"
echo "    go run ./cmd/server/"
echo ""
echo "  Start the web dev server:"
echo "    cd web && npm run dev"
echo ""
echo "  Register an admin user:"
echo "    curl -X POST http://localhost:${API_PORT}/api/v1/auth/register-admin \\"
echo "      -H 'Content-Type: application/json' \\"
echo '      -d '"'"'{"email":"admin@example.com","name":"Admin","password":"admin123"}'"'"''
echo ""
echo "  OpenFGA Playground:"
echo "    http://localhost:8081/playground"
echo ""
echo "  Stop OpenFGA:"
echo "    docker stop openfga"
echo ""