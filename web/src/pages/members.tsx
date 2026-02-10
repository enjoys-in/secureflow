import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Search, Shield, Users, CheckCircle2, Mail, Clock } from "lucide-react"
import type { User, Invitation, ResourcePermission } from "@/types"
import { logActivity } from "@/types"
import { MemberRow, InviteDialog } from "@/components/members"

// ---- Mock data ----

const initialMembers: User[] = [
  { id: "u-001", name: "Admin User", email: "admin@example.com", role: "admin", status: "active", joinedAt: "2026-01-01", lastActive: "2 minutes ago" },
  { id: "u-002", name: "John Doe", email: "john@example.com", role: "editor", status: "active", joinedAt: "2026-01-15", lastActive: "1 hour ago" },
  { id: "u-003", name: "Jane Smith", email: "jane@example.com", role: "editor", status: "active", joinedAt: "2026-01-20", lastActive: "3 hours ago" },
  { id: "u-004", name: "Bob Wilson", email: "bob@example.com", role: "viewer", status: "active", joinedAt: "2026-02-01", lastActive: "1 day ago" },
  { id: "u-005", name: "Alice Chen", email: "alice@example.com", role: "viewer", status: "inactive", joinedAt: "2026-02-05", lastActive: "5 days ago" },
]

const memberPermissions: Record<string, ResourcePermission[]> = {
  "u-001": [
    { scope: "system", role: "owner" },
    { scope: "firewall", role: "owner" },
    { scope: "security_group", role: "owner" },
  ],
  "u-002": [
    { scope: "system", role: "editor" },
    { scope: "firewall", role: "admin" },
    { scope: "security_group", role: "editor" },
  ],
  "u-003": [
    { scope: "firewall", role: "editor" },
    { scope: "security_group", role: "editor" },
  ],
  "u-004": [
    { scope: "system", role: "viewer" },
    { scope: "firewall", role: "viewer" },
  ],
  "u-005": [
    { scope: "firewall", role: "viewer" },
  ],
}

const initialInvitations: Invitation[] = [
  {
    id: "inv-001",
    email: "sarah@example.com",
    permissions: [
      { scope: "firewall", role: "editor" },
      { scope: "security_group", role: "viewer" },
    ],
    invitedBy: "Admin User",
    invitedAt: "2026-02-08",
    status: "pending",
    expiresAt: "2026-02-15",
  },
]

// ---- Page ----

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [members] = useState<User[]>(initialMembers)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInvite = (email: string, permissions: ResourcePermission[]) => {
    const inv: Invitation = {
      id: `inv-${String(invitations.length + 1).padStart(3, "0")}`,
      email,
      permissions,
      invitedBy: "Admin User",
      invitedAt: new Date().toISOString().slice(0, 10),
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }
    setInvitations((prev) => [...prev, inv])
    logActivity({
      timestamp: new Date().toISOString(),
      page: "Members",
      action: "INVITE_USER",
      data: { email, permissions },
    })
  }

  const activeCount = members.filter((m) => m.status === "active").length
  const adminCount = members.filter((m) => m.role === "admin").length
  const pendingCount = invitations.filter((i) => i.status === "pending").length

  const scopeLabels: Record<string, string> = {
    system: "System",
    firewall: "Firewall",
    security_group: "Sec Groups",
  }

  const roleColors: Record<string, string> = {
    owner: "bg-amber-600",
    admin: "bg-red-500",
    editor: "bg-blue-500",
    viewer: "bg-gray-500",
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header — static */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team Members</h1>
          <p className="text-[13px] text-muted-foreground">
            Manage team members, invitations, and scoped permissions
          </p>
        </div>
        <InviteDialog onInvite={handleInvite} />
      </div>

      {/* Stats — static */}
      <div className="grid gap-4 md:grid-cols-4 shrink-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-[#ff9900]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search — static */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members or invitations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              logActivity({
                timestamp: new Date().toISOString(),
                page: "Members",
                action: "SEARCH",
                data: { query: e.target.value },
              })
            }}
          />
        </div>
      </div>

      {/* Tabs — fills remaining space, scrollable content */}
      <Tabs defaultValue="members" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 mb-4">
          <TabsTrigger value="members">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Mail className="mr-1.5 h-3.5 w-3.5" /> Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="flex-1 min-h-0 mt-0">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      permissions={memberPermissions[member.id]}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="flex-1 min-h-0 mt-0">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations
                    .filter(
                      (inv) =>
                        !searchQuery ||
                        inv.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{inv.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {inv.permissions.map((p) => (
                              <Badge
                                key={`${p.scope}-${p.role}`}
                                className={`${roleColors[p.role] ?? "bg-gray-500"} text-white text-[10px] px-1.5 py-0`}
                              >
                                {scopeLabels[p.scope]}: {p.role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              inv.status === "pending"
                                ? "border-amber-500 text-amber-500"
                                : inv.status === "accepted"
                                  ? "border-green-500 text-green-500"
                                  : "border-gray-500 text-gray-500"
                            }
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inv.invitedBy}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inv.expiresAt}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
