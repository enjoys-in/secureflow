CREATE TABLE IF NOT EXISTS firewall_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    security_group_id UUID REFERENCES security_groups(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    protocol VARCHAR(10) NOT NULL CHECK (protocol IN ('tcp', 'udp', 'icmp', 'all')),
    port INTEGER NOT NULL CHECK (port >= 0 AND port <= 65535),
    port_range_end INTEGER DEFAULT 0,
    source_cidr VARCHAR(50) DEFAULT '0.0.0.0/0',
    dest_cidr VARCHAR(50) DEFAULT '',
    action VARCHAR(10) NOT NULL CHECK (action IN ('ACCEPT', 'DROP', 'REJECT')),
    description TEXT DEFAULT '',
    is_immutable BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
