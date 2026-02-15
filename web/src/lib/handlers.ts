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

export interface FirewallRuleWithDetailsDTO {
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
    security_group_name: string
    created_by_name: string
    created_by_email: string
}

export interface ListeningPortDTO {
    port: number
    protocol: string
    address: string
    pid?: number
    process?: string
    state: string
}

// ---- Processes ----
export interface ProcessDTO {
    pid: number
    name: string
    user: string
    cpu_percent: number
    memory_percent: number
    memory_rss_kb: number
    state: string
    listening_ports?: number[]
    command: string
    start_time: string
}

// ---- Blocked IPs ----
export interface BlockedIPDTO {
    id: string
    ip: string
    reason: string
    status: "blocked" | "unblocked"
    blocked_by: string
    unblocked_by?: string
    blocked_at: string
    unblocked_at?: string
    created_at: string
    blocked_by_name: string
    blocked_by_email: string
    unblocked_by_name?: string
    unblocked_by_email?: string
}

export interface BlockIPsPayload {
    ips: string[]
    reason: string
}

export interface UnblockIPsPayload {
    ips?: string[]
    id?: string
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
    rule_count: number
    inbound_count: number
    outbound_count: number
    created_by_name: string
    created_by_email: string
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

export interface MemberDTO {
    id: string
    email: string
    name: string
    roles: string[]
    created_at: string
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

export interface InvitationWithInviterDTO {
    id: string
    email: string
    role: string
    invited_by: string
    inviter_name: string
    inviter_email: string
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
    const { data } = await api.get<{ rules: FirewallRuleDTO[] }>("/rules", { signal })
    return data.rules
}

export async function listAllRulesWithDetails(params?: { limit?: number; offset?: number }, signal?: AbortSignal) {
    const { data } = await api.get<{ rules: FirewallRuleWithDetailsDTO[]; limit: number; offset: number }>("/rules/all", {
        params,
        signal,
    })
    return data
}

export async function listListeningPorts(signal?: AbortSignal) {
    const { data } = await api.get<{ listening_ports: ListeningPortDTO[]; os: string }>("/system/ports", { signal })
    return data
}

export async function listProcesses(signal?: AbortSignal) {
    const { data } = await api.get<{ processes: ProcessDTO[]; total: number; os: string }>("/system/processes", { signal })
    return data
}

// ---- Blocked IPs ----

export async function listBlockedIPs(params?: { status?: string; limit?: number; offset?: number }, signal?: AbortSignal) {
    const { data } = await api.get<{
        blocked_ips: BlockedIPDTO[]
        total: number
        blocked_count: number
        unblocked_count: number
        limit: number
        offset: number
    }>("/blocked-ips", { params, signal })
    return data
}

export async function blockIPs(payload: BlockIPsPayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; blocked: number; invalid_ips: string[] }>("/blocked-ips/block", payload, { signal })
    return data
}

export async function unblockIPs(payload: UnblockIPsPayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; unblocked: number }>("/blocked-ips/unblock", payload, { signal })
    return data
}

export async function reblockIP(id: string, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string }>(`/blocked-ips/reblock/${id}`, {}, { signal })
    return data
}

export async function addFirewallRule(payload: AddRulePayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; rule: FirewallRuleDTO }>("/rules", payload, { signal })
    return data
}

export async function deleteFirewallRule(ruleId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/rules/${ruleId}`, { signal })
    return data
}

// ---- Immutable Ports ----

export async function listImmutablePorts(signal?: AbortSignal) {
    const { data } = await api.get<{ immutable_ports: ImmutablePortDTO[]; message: string }>("/ports", { signal })
    return data.immutable_ports
}

export async function addImmutablePort(payload: AddImmutablePortPayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; port: ImmutablePortDTO }>("/ports", payload, { signal })
    return data
}

export async function deleteImmutablePort(portId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/ports/${portId}`, { signal })
    return data
}

// ---- Security Groups ----

export async function listSecurityGroups(signal?: AbortSignal) {
    const { data } = await api.get<{ security_groups: SecurityGroupDTO[] }>("/profiles", { signal })
    return data.security_groups
}

export async function createSecurityGroup(payload: CreateSecurityGroupPayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; security_group: SecurityGroupDTO }>("/profiles", payload, { signal })
    return data
}

export async function getSecurityGroup(groupId: string, signal?: AbortSignal) {
    const { data } = await api.get<{ security_group: SecurityGroupDTO; rules: FirewallRuleDTO[] }>(`/profiles/${groupId}`, { signal })
    return data
}

export async function updateSecurityGroup(groupId: string, payload: CreateSecurityGroupPayload, signal?: AbortSignal) {
    const { data } = await api.put<{ message: string; security_group: SecurityGroupDTO }>(`/profiles/${groupId}`, payload, { signal })
    return data
}

export async function deleteSecurityGroup(groupId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/profiles/${groupId}`, { signal })
    return data
}

export async function addRuleToGroup(groupId: string, payload: AddRulePayload, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; rule: FirewallRuleDTO }>(`/profiles/${groupId}/rules`, payload, { signal })
    return data
}

export async function listGroupRules(groupId: string, signal?: AbortSignal) {
    const { data } = await api.get<{ rules: FirewallRuleDTO[] }>(`/profiles/${groupId}/rules`, { signal })
    return data.rules
}

export async function deleteRuleFromGroup(groupId: string, ruleId: string, signal?: AbortSignal) {
    const { data } = await api.delete<{ message: string }>(`/profiles/${groupId}/rules/${ruleId}`, { signal })
    return data
}

export async function applySecurityGroup(groupId: string, signal?: AbortSignal) {
    const { data } = await api.post<{ message: string; rules_count: number }>(`/profiles/${groupId}/apply`, {}, { signal })
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

export async function listMembers(params?: { limit?: number; offset?: number }, signal?: AbortSignal) {
    const { data } = await api.get<{ members: MemberDTO[]; limit: number; offset: number }>("/users/members", {
        params,
        signal,
    })
    return data
}

export async function listInvitations(params?: { limit?: number; offset?: number }, signal?: AbortSignal) {
    const { data } = await api.get<{ invitations: InvitationWithInviterDTO[]; limit: number; offset: number }>("/users/invitations", {
        params,
        signal,
    })
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

// ---- Dashboard Analytics ----

export interface DashboardStatsDTO {
    security_groups: number
    firewall_rules: number
    immutable_ports: number
    team_members: number
    blocked_ips: number
    inbound_rules: number
    outbound_rules: number
}

export interface RecentActivityDTO {
    id: string
    user_name: string
    action: string
    resource: string
    details: string
    timestamp: string
}

export async function getDashboardStats(signal?: AbortSignal) {
    const { data } = await api.get<{ stats: DashboardStatsDTO }>("/dashboard/stats", { signal })
    return data.stats
}

export async function getDashboardRecentActivity(signal?: AbortSignal) {
    const { data } = await api.get<{ recent_activity: RecentActivityDTO[] }>("/dashboard/activity", { signal })
    return data.recent_activity
}

// ---- WebSocket ----

export function connectWebSocket(): WebSocket {
    const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(/^http/, "ws")
    return new WebSocket(`${baseUrl}/events/ws`)
}
