CREATE TABLE IF NOT EXISTS immutable_ports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
    protocol VARCHAR(10) NOT NULL DEFAULT 'tcp',
    service_name VARCHAR(100) DEFAULT '',
    is_default BOOLEAN DEFAULT FALSE,
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (port, protocol)
);

CREATE INDEX IF NOT EXISTS idx_immutable_ports_port ON immutable_ports(port);
