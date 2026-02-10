package constants

// --- Roles ---
const (
	RoleAdmin  = "admin"
	RoleEditor = "editor"
	RoleViewer = "viewer"
)

// ValidRoles contains all valid user roles.
var ValidRoles = map[string]bool{
	RoleAdmin:  true,
	RoleEditor: true,
	RoleViewer: true,
}

// --- Directions ---
const (
	DirectionInbound  = "inbound"
	DirectionOutbound = "outbound"
)

// --- Protocols ---
const (
	ProtocolTCP  = "tcp"
	ProtocolUDP  = "udp"
	ProtocolICMP = "icmp"
	ProtocolAll  = "all"
)

// --- Firewall Actions ---
const (
	ActionAccept = "ACCEPT"
	ActionDrop   = "DROP"
	ActionReject = "REJECT"
)

// --- Firewall Backends ---
const (
	BackendIPTables = "iptables"
	BackendNFTables = "nftables"
)

// --- WebSocket / Event Types ---
const (
	EventTypeTraffic    = "traffic"
	EventTypeRuleChange = "rule_change"
	EventTypeError      = "error"
	EventTypeAudit      = "audit"
)

// --- Audit Actions ---
const (
	AuditActionAddRule             = "add_rule"
	AuditActionDeleteRule          = "delete_rule"
	AuditActionCreateSecurityGroup = "create_security_group"
	AuditActionUpdateSecurityGroup = "update_security_group"
	AuditActionDeleteSecurityGroup = "delete_security_group"
	AuditActionApplySecurityGroup  = "apply_security_group"
	AuditActionInviteUser          = "invite_user"
	AuditActionAcceptInvite        = "accept_invite"
	AuditActionRegister            = "register"
	AuditActionLogin               = "login"
	AuditActionAddImmutablePort    = "add_immutable_port"
	AuditActionDeleteImmutablePort = "delete_immutable_port"
)

// --- Pagination ---
const (
	DefaultPageLimit = 50
	MaxPageLimit     = 200
)

// --- Auth ---
const (
	TokenExpiryHours  = 24
	InviteExpiryHours = 72
	MinPasswordLength = 8
	InviteTokenBytes  = 32
)

// --- OpenFGA ---
const (
	FGATypeUser          = "user"
	FGATypeSystem        = "system"
	FGATypeFirewall      = "firewall"
	FGATypeSecurityGroup = "security_group"
	FGAObjectSystem      = "system:firewall-manager"
	FGAObjectFirewall    = "firewall:main"
)

// --- OpenFGA Relations ---
const (
	RelationOwner    = "owner"
	RelationAdmin    = "admin"
	RelationEditor   = "editor"
	RelationViewer   = "viewer"
	RelationCanView  = "can_view"
	RelationCanEdit  = "can_edit"
	RelationCanAdmin = "can_admin"
)
