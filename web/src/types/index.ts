// ---- Auth ----
export interface LoginPayload {
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

// ---- User / Member ----
export type UserRole = "admin" | "editor" | "viewer"
export type UserStatus = "active" | "inactive"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  joinedAt: string
  lastActive: string
}

// ---- Permissions (matches OpenFGA model.dsl) ----
export type ResourceScope = "system" | "firewall" | "security_group"
export type SystemRole = "owner" | "admin" | "editor" | "viewer"
export type FirewallRole = "owner" | "admin" | "editor" | "viewer"
export type SecurityGroupRole = "owner" | "editor" | "viewer"

export interface ResourcePermission {
  scope: ResourceScope
  role: string
}

export const PERMISSION_SCOPES: { scope: ResourceScope; label: string; roles: string[] }[] = [
  { scope: "system", label: "System", roles: ["owner", "admin", "editor", "viewer"] },
  { scope: "firewall", label: "Firewall", roles: ["owner", "admin", "editor", "viewer"] },
  { scope: "security_group", label: "Security Groups", roles: ["owner", "editor", "viewer"] },
]

// ---- Invitation ----
export type InvitationStatus = "pending" | "accepted" | "expired"

export interface Invitation {
  id: string
  email: string
  permissions: ResourcePermission[]
  invitedBy: string
  invitedAt: string
  status: InvitationStatus
  expiresAt: string
}

// ---- Security Group ----
export type SecurityGroupStatus = "active" | "inactive"

export interface SecurityGroup {
  id: string
  name: string
  description: string
  rulesCount: number
  serversAttached: number
  createdBy: string
  createdAt: string
  status: SecurityGroupStatus
}

export interface SecurityGroupRule {
  id: string
  type: string
  protocol: string
  portRange: string
  source: string
  description: string
  immutable?: boolean
}

// ---- Firewall Rule ----
export type RuleDirection = "inbound" | "outbound"
export type RuleAction = "allow" | "deny"

export interface FirewallRule {
  id: string
  name: string
  direction: RuleDirection
  protocol: string
  port: string
  source: string
  action: RuleAction
  enabled: boolean
  immutable: boolean
  securityGroup: string
  createdBy: string
  createdAt: string
}

// ---- Protected / Immutable Port ----
export type PortCategory = "system" | "mail" | "database"

export interface ProtectedPort {
  port: number
  protocol: string
  service: string
  description: string
  reason: string
  category: PortCategory
}

// ---- Audit Log ----
export type AuditActionType = "create" | "delete" | "update" | "login" | "invite" | "apply"

export interface AuditLog {
  id: string
  timestamp: string
  user: string
  userEmail: string
  action: string
  actionType: AuditActionType
  resource: string
  resourceType: string
  details: string
  ipAddress: string
}

// ---- Real‑Time Log Entry ----
export type PacketAction = "ACCEPT" | "DROP" | "REJECT"
export type PacketDirection = "IN" | "OUT"

export interface LiveLogEntry {
  id: number
  timestamp: string
  srcIp: string
  dstIp: string
  protocol: string
  port: number
  action: PacketAction
  direction: PacketDirection
  ruleId: string
  bytes: number
}

// ---- Settings / Profile ----
export interface ProfilePayload {
  firstName: string
  lastName: string
  email: string
  timezone: string
}

export interface PasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface NotificationPreference {
  key: string
  title: string
  description: string
  enabled: boolean
}

// ---- Server ----
export type ServerStatus = "online" | "offline"

export interface ManagedServer {
  name: string
  ip: string
  os: string
  status: ServerStatus
  firewallEngine: string
  groups: number
  rules: number
}

// ---- Activity Log (console) ----
export interface UserActivity {
  timestamp: string
  page: string
  action: string
  data?: unknown
}

// ---- Helpers ----
export function logActivity(activity: UserActivity): void {
  console.log(
    `%c[Activity] %c${activity.page} → ${activity.action}`,
    "color:#FF9900;font-weight:bold",
    "color:#232F3E",
    activity,
  )
}
