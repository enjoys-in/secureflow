# Build stage — Go backend
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /firewall-manager ./cmd/server

# Build stage — React frontend
FROM oven/bun:1-alpine AS frontend

WORKDIR /app/web

COPY web/package.json web/bun.lockb* ./
RUN bun install --frozen-lockfile

COPY web/ .
RUN bun run build

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates iptables ip6tables nftables

WORKDIR /app

COPY --from=builder /firewall-manager .
COPY --from=builder /app/migrations ./migrations
COPY --from=frontend /app/web/dist ./web/dist

EXPOSE 8443

ENTRYPOINT ["./firewall-manager"]
