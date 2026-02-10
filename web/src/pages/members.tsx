import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Shield, Users, CheckCircle2 } from "lucide-react"
import type { User } from "@/types"
import { logActivity } from "@/types"

const mockMembers: User[] = [
  { id: "u-001", name: "Admin User", email: "admin@example.com", role: "admin", status: "active", joinedAt: "2026-01-01", lastActive: "2 minutes ago" },
  { id: "u-002", name: "John Doe", email: "john@example.com", role: "editor", status: "active", joinedAt: "2026-01-15", lastActive: "1 hour ago" },
  { id: "u-003", name: "Jane Smith", email: "jane@example.com", role: "editor", status: "active", joinedAt: "2026-01-20", lastActive: "3 hours ago" },
  { id: "u-004", name: "Bob Wilson", email: "bob@example.com", role: "viewer", status: "active", joinedAt: "2026-02-01", lastActive: "1 day ago" },
  { id: "u-005", name: "Alice Chen", email: "alice@example.com", role: "viewer", status: "inactive", joinedAt: "2026-02-05", lastActive: "5 days ago" },
]

const roleColors = {
  admin: "bg-red-500",
  editor: "bg-blue-500",
  viewer: "bg-gray-500",
}

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredMembers = mockMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Team Members</h1>
        <p className="text-[13px] text-muted-foreground">View team members and their roles</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <div className="text-2xl font-bold">{mockMembers.filter((m) => m.role === "admin").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMembers.filter((m) => m.status === "active").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              logActivity({ timestamp: new Date().toISOString(), page: "Members", action: "SEARCH", data: { query: e.target.value } })
            }}
          />
        </div>
      </div>

      {/* Members Table — Read Only */}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-[#ff9900] text-white">
                          {member.name.split(" ").map((n) => n[0]).join("")}
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
                      <div className={`h-2 w-2 ${member.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className="text-sm capitalize">{member.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.joinedAt}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.lastActive}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
