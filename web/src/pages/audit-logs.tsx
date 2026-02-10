import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { logActivity } from "@/types"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  Download,
  Filter,
  Plus,
  Trash2,
  Pencil,
  UserPlus,
  ShieldCheck,
  LogIn,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  userEmail: string
  action: string
  actionType: "create" | "delete" | "update" | "login" | "invite" | "apply"
  resource: string
  resourceType: string
  details: string
  ipAddress: string
}

const mockLogs: AuditLog[] = [
  {
    id: "log-001",
    timestamp: "2026-02-10 14:32:15",
    user: "Admin User",
    userEmail: "admin@example.com",
    action: "Created firewall rule",
    actionType: "create",
    resource: "rule-012",
    resourceType: "Firewall Rule",
    details: "Allow TCP 443 from 0.0.0.0/0 in Web Servers group",
    ipAddress: "192.168.1.5",
  },
  {
    id: "log-002",
    timestamp: "2026-02-10 14:28:03",
    user: "Admin User",
    userEmail: "admin@example.com",
    action: "Applied security group",
    actionType: "apply",
    resource: "sg-001",
    resourceType: "Security Group",
    details: "Applied 'Web Servers' to vps-1 (192.168.1.10)",
    ipAddress: "192.168.1.5",
  },
  {
    id: "log-003",
    timestamp: "2026-02-10 13:15:42",
    user: "John Doe",
    userEmail: "john@example.com",
    action: "Updated security group",
    actionType: "update",
    resource: "sg-003",
    resourceType: "Security Group",
    details: "Modified 'Monitoring' - added port 9090/TCP",
    ipAddress: "10.0.0.15",
  },
  {
    id: "log-004",
    timestamp: "2026-02-10 12:45:00",
    user: "Admin User",
    userEmail: "admin@example.com",
    action: "Invited member",
    actionType: "invite",
    resource: "inv-001",
    resourceType: "Invitation",
    details: "Invited newmember@example.com as editor",
    ipAddress: "192.168.1.5",
  },
  {
    id: "log-005",
    timestamp: "2026-02-10 11:30:22",
    user: "Jane Smith",
    userEmail: "jane@example.com",
    action: "Deleted firewall rule",
    actionType: "delete",
    resource: "rule-008",
    resourceType: "Firewall Rule",
    details: "Removed 'Block UDP 8080' from Monitoring group",
    ipAddress: "10.0.0.20",
  },
  {
    id: "log-006",
    timestamp: "2026-02-10 10:12:33",
    user: "Bob Wilson",
    userEmail: "bob@example.com",
    action: "Logged in",
    actionType: "login",
    resource: "session-445",
    resourceType: "Auth",
    details: "Successful login via email/password",
    ipAddress: "172.16.0.50",
  },
  {
    id: "log-007",
    timestamp: "2026-02-10 09:55:18",
    user: "Admin User",
    userEmail: "admin@example.com",
    action: "Created security group",
    actionType: "create",
    resource: "sg-005",
    resourceType: "Security Group",
    details: "Created 'Staging Servers' group",
    ipAddress: "192.168.1.5",
  },
  {
    id: "log-008",
    timestamp: "2026-02-09 23:12:00",
    user: "Admin User",
    userEmail: "admin@example.com",
    action: "Updated firewall rule",
    actionType: "update",
    resource: "rule-006",
    resourceType: "Firewall Rule",
    details: "Updated source IP from 185.143.223.0/24 to 185.143.0.0/16",
    ipAddress: "192.168.1.5",
  },
  {
    id: "log-009",
    timestamp: "2026-02-09 20:30:45",
    user: "John Doe",
    userEmail: "john@example.com",
    action: "Logged in",
    actionType: "login",
    resource: "session-443",
    resourceType: "Auth",
    details: "Successful login via email/password",
    ipAddress: "10.0.0.15",
  },
  {
    id: "log-010",
    timestamp: "2026-02-09 18:00:12",
    user: "Admin User",
    userEmail: "admin@example.com",
    action: "Attempted to modify protected port",
    actionType: "update",
    resource: "port-22",
    resourceType: "Protected Port",
    details: "Blocked: Cannot modify immutable port 22 (SSH)",
    ipAddress: "192.168.1.5",
  },
]

const actionTypeIcons = {
  create: <Plus className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
  update: <Pencil className="h-3.5 w-3.5" />,
  login: <LogIn className="h-3.5 w-3.5" />,
  invite: <UserPlus className="h-3.5 w-3.5" />,
  apply: <ShieldCheck className="h-3.5 w-3.5" />,
}

const actionTypeColors = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  login: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  invite: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  apply: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  useEffect(() => {
    logActivity({ timestamp: new Date().toISOString(), page: "AuditLogs", action: "PAGE_VIEW" })
  }, [])

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.includes(searchQuery)
    const matchesAction = actionFilter === "all" || log.actionType === actionFilter
    return matchesSearch && matchesAction
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-[13px] text-muted-foreground">
            Track all user actions, rule changes, and system events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="invite">Invitations</SelectItem>
                <SelectItem value="apply">Applied</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} entries
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm font-mono">{log.timestamp}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {log.user
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{log.user}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                        actionTypeColors[log.actionType]
                      }`}
                    >
                      {actionTypeIcons[log.actionType]}
                      {log.action}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.resource}
                      </code>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.resourceType}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {log.details}
                    </p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {log.ipAddress}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page 1 of 1 · {filteredLogs.length} total entries
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
