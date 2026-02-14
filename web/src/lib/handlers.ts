import api from "./api"


// ---- Auth ----
export interface RegisterPayload {
    email: string
    name: string
    password: string
}

export interface LoginPayload {
    email: string
    password: string
}

export interface AcceptInvitePayload {
    name: string
    password: string
}

export interface AuthResponse {
    message: string
    user: UserDTO
    token: string
    role?: string
}

export interface UserDTO {
    id: string
    email: string
    name: string
    created_at: string
    updated_at: string
}

// ---- Firewall Rules ----
export interface AddRulePayload {
    security_group_id?: string
    direction: "inbound" | "outbound"
    protocol: string
    port: number
    port_range_end?: number
    source_cidr: string
    dest_cidr?: string
    action: string
    description?: string
}

export interface FirewallRuleDTO {
    id: string
    security_group_id: string
    direction: string
    protocol: string
    port: number
    port_range_end?: number
    source_cidr: string
    dest_cidr?: string
    action: string
    description?: string
    is_immutable: boolean
    created_by: string
    created_at: string
}

// ---- Security Groups ----
export interface CreateSecurityGroupPayload {
    name: string
    description?: string
}

export interface SecurityGroupDTO {
    id: string
    name: string
    description: string
    created_by: string
    created_at: string
    updated_at: string
}

// ---- Immutable Ports ----
export interface AddImmutablePortPayload {
    port: number
    protocol: string
    service_name: string
}

export interface ImmutablePortDTO {
    id: string
    port: number
    protocol: string
    service_name: string
    is_default: boolean
    added_by?: string
    created_at: string
}

// ---- Audit Logs ----
export interface AuditLogDTO {
    id: string
    user_id: string
    user_email: string
    user_name: string
    action: string
    resource: string
    details: string
    ip: string
    timestamp: string
}

// ---- Users ----
export interface InviteUserPayload {
    email: string
    role: string
}

export interface InvitationDTO {
    id: string
    email: string
    role: string
    invited_by: string
    expires_at: string
    accepted_at?: string
    created_at: string
}

// ---- Health ----
export interface HealthResponse {
    status: string
    database: boolean
    firewall: boolean
}

// ---- Current User Response ----
export interface CurrentUserResponse {
    user: UserDTO
    roles: string[]
}

// ============================================================
// API Handler Functions
// ============================================================

// ---- Auth ----

export async function register(payload: RegisterPayload, signal?: AbortSignal) {
    const { data } = await api.post<AuthResponse>("/auth/register", payload, { signal })
    return data
}

export async function login(payload: LoginPayload, signal?: AbortSignal) {
    const { data } = await api.post<AuthResponse>("/auth/login", payload, { signal })
    return data
}

export async function acceptInvite(token: string, payload: AcceptInvitePayload, signal?: AbortSignal) {
    const { data } = await api.post<AuthResponse>(`/auth/accept-invite?token=${encodeURIComponent(token)}`, payload, { signal })
    return data
}

// ---- Firewall Rules ----

export async function listFirewallRules(signal?: AbortSignal) {
    const { data } = await api.get<{ rules: FirewallRuleDTO[] }>("/firewall/rules", { signal })
    return data.rules
}

export async function addFirewallRule(payload: AddRulePayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; rule: FirewallRuleDTO }>("/firewall/rules", payload, { signal })
    return data
}

export async function deleteFirewallRule(ruleId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/firewall/rules/${ruleId}`, { signal })
    return data
}

// ---- Immutable Ports ----

export async function listImmutablePorts(signal?: AbortSignal) {
    const { data } = await api.get<{ immutable_ports: ImmutablePortDTO[]; message: string }>("/firewall/immutable-ports", { signal })
    return data.immutable_ports
}

export async function addImmutablePort(payload: AddImmutablePortPayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; port: ImmutablePortDTO }>("/firewall/immutable-ports", payload, { signal })
    return data
}

export async function deleteImmutablePort(portId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/firewall/immutable-ports/${portId}`, { signal })
    return data
}

// ---- Security Groups ----

export async function listSecurityGroups(signal?: AbortSignal) {
    const { data } = await api.get<{ security_groups: SecurityGroupDTO[] }>("/security-groups", { signal })
    return data.security_groups
}

export async function createSecurityGroup(payload: CreateSecurityGroupPayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; security_group: SecurityGroupDTO }>("/security-groups", payload, { signal })
    return data
}

export async function getSecurityGroup(groupId: string, signal?: AbortSignal) {
    const { data } = await api.get<{ security_group: SecurityGroupDTO; rules: FirewallRuleDTO[] }>(`/security-groups/${groupId}`, { signal })
    return data
}

export async function updateSecurityGroup(groupId: string, payload: CreateSecurityGroupPayload, signal?: AbortSignal) {
    const { data } = await api.put<{ message: string; security_group: SecurityGroupDTO }>(`/security-groups/${groupId}`, payload, { signal })
    return data
}

export async function deleteSecurityGroup(groupId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/security-groups/${groupId}`, { signal })
    return data
}

export async function addRuleToGroup(groupId: string, payload: AddRulePayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; rule: FirewallRuleDTO }>(`/security-groups/${groupId}/rules`, payload, { signal })
    return data
}

export async function listGroupRules(groupId: string, signal?: AbortSignal) {
    const { data } = await api.get<{ rules: FirewallRuleDTO[] }>(`/security-groups/${groupId}/rules`, { signal })
    return data.rules
}

export async function deleteRuleFromGroup(groupId: string, ruleId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/security-groups/${groupId}/rules/${ruleId}`, { signal })
    return data
}

export async function applySecurityGroup(groupId: string, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; rules_count: number }>(`/security-groups/${groupId}/apply`, {}, { signal })
    return data
}

// ---- Users & Invitations ----

export async function getCurrentUser(signal?: AbortSignal) {
    const { data } = await api.get<CurrentUserResponse>("/users/me", { signal })
    return data
}

export async function inviteUser(payload: InviteUserPayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; invitation: InvitationDTO; invite_url: string }>("/users/invite", payload, { signal })
    return data
}

// ---- Audit Logs ----

export async function getAuditLogs(params?: { limit?: number; offset?: number }, signal?: AbortSignal) {
    const { data } = await api.get<{ audit_logs: AuditLogDTO[]; limit: number; offset: number }>("/logs/audit", {
        params,
        signal,
    })
    return data
}

// ---- Health ----

export async function healthCheck(signal?: AbortSignal) {
    const { data } = await api.get<HealthResponse>("/health", { signal })
    return data
}

// ---- WebSocket ----

export function connectWebSocket(): WebSocket {
    const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(/^http/, "ws")
    return new WebSocket(`${baseUrl}/events/ws`)
}
