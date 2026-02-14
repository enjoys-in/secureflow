import { useState, useEffect, useCallback } from "react"
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
import { Search, Shield, Users, CheckCircle2, Mail, Clock, Loader2 } from "lucide-react"
import type { ResourcePermission } from "@/types"
import { logActivity } from "@/types"
import { MemberRow, InviteDialog } from "@/components/members"
import {
  listMembers,
  listInvitations,
  inviteUser,
  type MemberDTO,
  type InvitationWithInviterDTO,
} from "@/lib/handlers"

// ---- Page ----

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [members, setMembers] = useState<MemberDTO[]>([])
  const [invitations, setInvitations] = useState<InvitationWithInviterDTO[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [membersRes, invRes] = await Promise.all([
        listMembers(),
        listInvitations(),
      ])
      setMembers(membersRes.members ?? [])
      setInvitations(invRes.invitations ?? [])
    } catch (err) {
      console.error("Failed to fetch members data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    logActivity({ timestamp: new Date().toISOString(), page: "Members", action: "PAGE_VIEW" })
    fetchData()
  }, [fetchData])

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInvite = async (email: string, _permissions: ResourcePermission[]) => {
    try {
      // Use the first permission's role, or default to "viewer"
      const role = _permissions[0]?.role ?? "viewer"
      await inviteUser({ email, role })
      logActivity({
        timestamp: new Date().toISOString(),
        page: "Members",
        action: "INVITE_USER",
        data: { email, role },
      })
      // Refresh invitations list
      fetchData()
    } catch (err) {
      console.error("Failed to invite user:", err)
    }
  }

  const adminCount = members.filter((m) => m.roles?.includes("admin") || m.roles?.includes("owner")).length
  const pendingCount = invitations.length

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
            <div className="text-2xl font-bold">{members.length}</div>
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
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Primary Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading members...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                      />
                    ))
                  )}
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
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading invitations...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : invitations.filter(
                      (inv) =>
                        !searchQuery ||
                        inv.email.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No pending invitations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations
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
                            <Badge
                              className={`${roleColors[inv.role] ?? "bg-gray-500"} text-white text-[10px] px-1.5 py-0`}
                            >
                              {inv.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-amber-500 text-amber-500"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.inviter_name || inv.inviter_email || "Unknown"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(inv.expires_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
