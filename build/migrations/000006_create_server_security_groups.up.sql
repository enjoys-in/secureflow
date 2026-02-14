CREATE TABLE IF NOT EXISTS server_security_groups (
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    security_group_id UUID REFERENCES security_groups(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by UUID REFERENCES users(id),
    PRIMARY KEY (server_id, security_group_id)
);
