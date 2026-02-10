#!/bin/bash
set -euo pipefail

echo "=== Firewall Manager Setup ==="

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

# Install dependencies
echo "[1/4] Installing dependencies..."
if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y iptables nftables docker.io docker-compose-plugin
elif command -v yum &>/dev/null; then
    yum install -y iptables nftables docker docker-compose-plugin
fi

# Enable Docker
echo "[2/4] Starting Docker..."
systemctl enable docker
systemctl start docker

# Create certs directory
echo "[3/4] Setting up TLS certificates..."
mkdir -p certs
if [ ! -f certs/server.crt ]; then
    openssl req -x509 -newkey rsa:4096 -keyout certs/server.key -out certs/server.crt \
        -days 365 -nodes -subj "/CN=firewall-manager"
    echo "Self-signed TLS certificate generated"
fi

# Set up immutable iptables rules
echo "[4/4] Setting up immutable firewall rules..."
IMMUTABLE_PORTS=(22 25 465 587 3306 6379)
for port in "${IMMUTABLE_PORTS[@]}"; do
    iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || \
        iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
    echo "  Port $port: OPEN (immutable)"
done

echo ""
echo "=== Setup Complete ==="
echo "Run: docker compose up -d"
echo "API: https://localhost:8443"
echo "OpenFGA: http://localhost:8080"
