import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Filter,
} from "lucide-react"
import type { FirewallRule } from "@/types"
import { logActivity } from "@/types"

const mockRules: FirewallRule[] = [
  { id: "rule-001", name: "SSH Access", direction: "inbound", protocol: "TCP", port: "22", source: "0.0.0.0/0", action: "allow", enabled: true, immutable: true, securityGroup: "Web Servers", createdBy: "System", createdAt: "2026-01-01" },
  { id: "rule-002", name: "HTTPS Traffic", direction: "inbound", protocol: "TCP", port: "443", source: "0.0.0.0/0", action: "allow", enabled: true, immutable: false, securityGroup: "Web Servers", createdBy: "Admin", createdAt: "2026-01-15" },
  { id: "rule-003", name: "HTTP Traffic", direction: "inbound", protocol: "TCP", port: "80", source: "0.0.0.0/0", action: "allow", enabled: true, immutable: false, securityGroup: "Web Servers", createdBy: "Admin", createdAt: "2026-01-15" },
  { id: "rule-004", name: "MySQL Access", direction: "inbound", protocol: "TCP", port: "3306", source: "10.0.0.0/8", action: "allow", enabled: true, immutable: true, securityGroup: "Database Servers", createdBy: "System", createdAt: "2026-01-01" },
  { id: "rule-005", name: "Redis Access", direction: "inbound", protocol: "TCP", port: "6379", source: "10.0.0.0/8", action: "allow", enabled: true, immutable: true, securityGroup: "Database Servers", createdBy: "System", createdAt: "2026-01-01" },
  { id: "rule-006", name: "Block Suspicious IP", direction: "inbound", protocol: "All", port: "All", source: "185.143.223.0/24", action: "deny", enabled: true, immutable: false, securityGroup: "Web Servers", createdBy: "Admin", createdAt: "2026-02-08" },
  { id: "rule-007", name: "SMTP", direction: "inbound", protocol: "TCP", port: "25", source: "0.0.0.0/0", action: "allow", enabled: true, immutable: true, securityGroup: "Web Servers", createdBy: "System", createdAt: "2026-01-01" },
  { id: "rule-008", name: "SMTPS", direction: "inbound", protocol: "TCP", port: "465", source: "0.0.0.0/0", action: "allow", enabled: true, immutable: true, securityGroup: "Web Servers", createdBy: "System", createdAt: "2026-01-01" },
  { id: "rule-009", name: "Submission", direction: "inbound", protocol: "TCP", port: "587", source: "0.0.0.0/0", action: "allow", enabled: true, immutable: true, securityGroup: "Web Servers", createdBy: "System", createdAt: "2026-01-01" },
  { id: "rule-010", name: "Custom API", direction: "inbound", protocol: "TCP", port: "8443", source: "10.0.0.0/8", action: "allow", enabled: false, immutable: false, securityGroup: "Monitoring", createdBy: "John Doe", createdAt: "2026-02-05" },
  { id: "rule-011", name: "All Outbound", direction: "outbound", protocol: "All", port: "All", source: "0.0.0.0/0", action: "allow", enabled: true, immutable: false, securityGroup: "Web Servers", createdBy: "Admin", createdAt: "2026-01-15" },
]

export default function FirewallRulesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")

  const filteredRules = mockRules.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.port.includes(searchQuery) ||
      r.source.includes(searchQuery)
    const matchesDirection = directionFilter === "all" || r.direction === directionFilter
    const matchesAction = actionFilter === "all" || r.action === actionFilter
    return matchesSearch && matchesDirection && matchesAction
  })

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header — static */}
      <div className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight">Firewall Rules</h1>
        <p className="text-[13px] text-muted-foreground">
          View inbound and outbound firewall rules across all security groups
        </p>
      </div>

      {/* Filters — static */}
      <Card className="shrink-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rules, ports, IPs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  logActivity({ timestamp: new Date().toISOString(), page: "FirewallRules", action: "SEARCH", data: { query: e.target.value } })
                }}
              />
            </div>
            <Select value={directionFilter} onValueChange={(v) => {
              setDirectionFilter(v)
              logActivity({ timestamp: new Date().toISOString(), page: "FirewallRules", action: "FILTER_DIRECTION", data: { direction: v } })
            }}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => {
              setActionFilter(v)
              logActivity({ timestamp: new Date().toISOString(), page: "FirewallRules", action: "FILTER_ACTION", data: { action: v } })
            }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="allow">Allow</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredRules.length} of {mockRules.length} rules
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table — scrollable content, sticky table header */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Name</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Source/Dest</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Security Group</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id} className={rule.immutable ? "bg-muted/30" : ""}>
                  <TableCell>
                    {rule.immutable && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm">{rule.name}</span>
                      <p className="text-xs text-muted-foreground">{rule.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {rule.direction === "inbound" ? (
                        <ArrowDownToLine className="h-3 w-3" />
                      ) : (
                        <ArrowUpFromLine className="h-3 w-3" />
                      )}
                      {rule.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{rule.protocol}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5">{rule.port}</code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5">{rule.source}</code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={rule.action === "allow" ? "default" : "destructive"}
                      className={rule.action === "allow" ? "bg-emerald-600" : ""}
                    >
                      {rule.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rule.securityGroup}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={rule.enabled ? "border-emerald-500 text-emerald-500" : "border-gray-500 text-gray-500"}>
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
