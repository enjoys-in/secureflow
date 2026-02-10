# Firewall Manager

A production-grade, AWS-style firewall manager with role-based access control, real-time traffic monitoring, and security group management.

## Features

- **Firewall Rule Management** — CRUD operations for iptables/nftables rules via low-level syscalls
- **AWS-style Security Groups** — Create rule collections and apply them atomically
- **Immutable Critical Ports** — Ports 22, 25, 465, 587, 3306, 6379 are always open and cannot be blocked
- **Role-Based Access Control** — OpenFGA-powered user permissions (viewer, editor, admin)
- **User Invitations** — Invite team members with specific roles
- **Real-Time Logs** — WebSocket-based live traffic and event streaming
- **Audit Logging** — Full audit trail of all actions stored in PostgreSQL
- **REST API** — HTTP/2 API with JWT authentication
- **Concurrent & Scalable** — Mutex-protected operations, worker pools, atomic rule application with rollback

## Architecture

```
REST API (Fiber HTTP/2) ←→ OpenFGA (RBAC)
         ↓
    PostgreSQL (users, rules, audit)
         ↓
  Firewall Syscalls (iptables/nftables)
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Go 1.22+ (for development)

### Run with Docker Compose

```bash
docker compose up -d

# API:     http://localhost:8443
# OpenFGA: http://localhost:8080
```

### Development Setup

```bash
go mod tidy

export POSTGRES_DSN="postgres://fm_user:fm_password@localhost:5432/firewall_manager?sslmode=disable"
export OPENFGA_ENDPOINT="http://localhost:8080"
export JWT_SECRET="dev-secret"

go run ./cmd/server
```

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/accept-invite` | Accept invitation |

### Firewall Rules
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/firewall/rules` | List all active rules |
| POST | `/api/v1/firewall/rules` | Add a new rule |
| DELETE | `/api/v1/firewall/rules/:id` | Delete a rule |
| GET | `/api/v1/firewall/immutable-ports` | List protected ports |

### Security Groups
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/security-groups` | List all groups |
| POST | `/api/v1/security-groups` | Create group |
| GET | `/api/v1/security-groups/:id` | Get group with rules |
| PUT | `/api/v1/security-groups/:id` | Update group |
| DELETE | `/api/v1/security-groups/:id` | Delete group |
| POST | `/api/v1/security-groups/:id/rules` | Add rule to group |
| GET | `/api/v1/security-groups/:id/rules` | List group rules |
| DELETE | `/api/v1/security-groups/:id/rules/:ruleId` | Remove rule from group |
| POST | `/api/v1/security-groups/:id/apply` | Apply group to firewall |

### Users & Monitoring
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get current user |
| POST | `/api/v1/users/invite` | Invite user (admin) |
| GET | `/api/v1/audit-logs` | Get audit logs |
| GET | `/api/v1/events/ws` | WebSocket live events |
| GET | `/api/v1/health` | Health check |

## Immutable Ports

These ports are **always open** and cannot be blocked by any user, including admins:

| Port | Service |
|------|---------|
| 22 | SSH |
| 25 | SMTP |
| 465 | SMTPS |
| 587 | SMTP Submission |
| 3306 | MySQL |
| 6379 | Redis |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8443 | API server port |
| `ALLOW_ORIGINGS` | "*"| Pass the Domain you want to Allow in CORS |
| `POSTGRES_DSN` | localhost | PostgreSQL connection string |
| `OPENFGA_ENDPOINT` | http://localhost:8080 | OpenFGA API endpoint |
| `OPENFGA_STORE_ID` | | OpenFGA store ID |
| `JWT_SECRET` | change-me | JWT signing secret |
| `FIREWALL_BACKEND` | iptables | Backend: iptables or nftables |
| `IMMUTABLE_PORTS` | 22,25,465,587,3306,6379 | Protected ports |
| `TLS_ENABLED` | false | Enable TLS |
| `TLS_CERT_FILE` | certs/server.crt | TLS certificate |
| `TLS_KEY_FILE` | certs/server.key | TLS key |
| `LOG_LEVEL` | info | debug, info, warn, error |
| `LOG_FORMAT` | json | json or text |

## Security

- All API endpoints (except auth) require JWT authentication
- OpenFGA enforces role-based permissions
- Immutable ports enforced at the syscall layer — cannot be bypassed
- All modifications logged in audit trail
- TLS support for production deployment
- Container runs with `CAP_NET_ADMIN` (minimum privilege for firewall ops)

## License

MIT


TODO: use syscall or netlink to handle firwalla nd ports or to talk to linux kernal