import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Mail,
  Shield,
  Users,
  Clock,
  Trash2,
  UserCog,
  Send,
  Copy,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface Member {
  id: string
  name: string
  email: string
  role: "admin" | "editor" | "viewer"
  status: "active" | "inactive"
  joinedAt: string
  lastActive: string
}

interface Invitation {
  id: string
  email: string
  role: "admin" | "editor" | "viewer"
  invitedBy: string
  sentAt: string
  status: "pending" | "accepted" | "expired"
}

const mockMembers: Member[] = [
  {
    id: "u-001",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    joinedAt: "2026-01-01",
    lastActive: "2 minutes ago",
  },
  {
    id: "u-002",
    name: "John Doe",
    email: "john@example.com",
    role: "editor",
    status: "active",
    joinedAt: "2026-01-15",
    lastActive: "1 hour ago",
  },
  {
    id: "u-003",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "editor",
    status: "active",
    joinedAt: "2026-01-20",
    lastActive: "3 hours ago",
  },
  {
    id: "u-004",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "viewer",
    status: "active",
    joinedAt: "2026-02-01",
    lastActive: "1 day ago",
  },
  {
    id: "u-005",
    name: "Alice Chen",
    email: "alice@example.com",
    role: "viewer",
    status: "inactive",
    joinedAt: "2026-02-05",
    lastActive: "5 days ago",
  },
]

const mockInvitations: Invitation[] = [
  {
    id: "inv-001",
    email: "newmember@example.com",
    role: "editor",
    invitedBy: "Admin User",
    sentAt: "2026-02-09",
    status: "pending",
  },
  {
    id: "inv-002",
    email: "devops@example.com",
    role: "admin",
    invitedBy: "Admin User",
    sentAt: "2026-02-08",
    status: "pending",
  },
  {
    id: "inv-003",
    email: "bob@example.com",
    role: "viewer",
    invitedBy: "Admin User",
    sentAt: "2026-01-30",
    status: "accepted",
  },
  {
    id: "inv-004",
    email: "expired@example.com",
    role: "viewer",
    invitedBy: "John Doe",
    sentAt: "2026-01-10",
    status: "expired",
  },
]

const roleColors = {
  admin: "bg-red-500",
  editor: "bg-blue-500",
  viewer: "bg-gray-500",
}

const roleDescriptions = {
  admin: "Full access — manage rules, groups, members, and settings",
  editor: "Can create and modify firewall rules and security groups",
  viewer: "Read-only access to view rules, logs, and dashboards",
}

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)

  const filteredMembers = mockMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage team members and invite new users with role-based permissions
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your firewall management team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input id="invite-email" type="email" placeholder="colleague@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select defaultValue="viewer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Editor
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        Viewer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <p className="text-sm font-medium">Role Permissions:</p>
                {Object.entries(roleDescriptions).map(([role, desc]) => (
                  <div key={role} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className={`h-2 w-2 rounded-full mt-1 ${roleColors[role as keyof typeof roleColors]}`} />
                    <span>
                      <strong className="capitalize">{role}:</strong> {desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setInviteOpen(false)}>
                <Send className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockMembers.filter((m) => m.role === "admin").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockMembers.filter((m) => m.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invites</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockInvitations.filter((i) => i.status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            Members ({mockMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({mockInvitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleColors[member.role]} text-white capitalize`}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              member.status === "active" ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          <span className="text-sm capitalize">{member.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.joinedAt}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.lastActive}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <UserCog className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInvitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{invite.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleColors[invite.role]} text-white capitalize`}>
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.invitedBy}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.sentAt}
                      </TableCell>
                      <TableCell>
                        {invite.status === "pending" && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {invite.status === "accepted" && (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Accepted
                          </Badge>
                        )}
                        {invite.status === "expired" && (
                          <Badge variant="outline" className="border-red-500 text-red-500">
                            <XCircle className="mr-1 h-3 w-3" />
                            Expired
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {invite.status === "pending" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Send className="mr-2 h-4 w-4" />
                                Resend
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Revoke
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
