import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { logActivity } from "@/types"
import {
  TableBody,
  TableCell,
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
  Loader2,
} from "lucide-react"
import { getAuditLogs, type AuditLogDTO } from "@/lib/handlers"

type ActionType = "create" | "delete" | "update" | "login" | "invite" | "apply"

function inferActionType(action: string): ActionType {
  const lower = action.toLowerCase()
  if (lower.includes("delete") || lower.includes("remove")) return "delete"
  if (lower.includes("update") || lower.includes("edit") || lower.includes("modify")) return "update"
  if (lower.includes("login") || lower.includes("sign in") || lower.includes("logged in")) return "login"
  if (lower.includes("invite")) return "invite"
  if (lower.includes("apply") || lower.includes("applied")) return "apply"
  return "create"
}

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

const PAGE_SIZE = 25

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [logs, setLogs] = useState<AuditLogDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchLogs = useCallback(async (currentOffset: number) => {
    setLoading(true)
    try {
      const data = await getAuditLogs({ limit: PAGE_SIZE, offset: currentOffset })
      setLogs(data.audit_logs ?? [])
      setHasMore((data.audit_logs?.length ?? 0) >= PAGE_SIZE)
    } catch (err) {
      console.error("Failed to fetch audit logs:", err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    logActivity({ timestamp: new Date().toISOString(), page: "AuditLogs", action: "PAGE_VIEW" })
    fetchLogs(offset)
  }, [offset, fetchLogs])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.includes(searchQuery)
    const actionType = inferActionType(log.action)
    const matchesAction = actionFilter === "all" || actionType === actionFilter
    return matchesSearch && matchesAction
  })

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header — static */}
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
          <Button variant="outline" size="sm" onClick={() => fetchLogs(offset)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters — static */}
      <Card className="shrink-0">
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

      {/* Logs Table — scrollable */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="h-full overflow-auto relative">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-card z-10 [&_tr]:border-b">
              <tr className="border-b">
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Timestamp</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Action</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Resource</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Details</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">IP Address</th>
              </tr>
            </thead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading audit logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actionType = inferActionType(log.action)
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {log.user_name
                                ? log.user_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                : log.user_id.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.user_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{log.user_email || log.user_id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${actionTypeColors[actionType]}`}
                        >
                          {actionTypeIcons[actionType]}
                          {log.action}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.resource}
                        </code>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {log.details}
                        </p>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.ip}
                        </code>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination — static */}
      <div className="flex items-center justify-between shrink-0">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} · {filteredLogs.length} entries shown
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || loading}
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
