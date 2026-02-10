import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react"

interface FirewallRule {
  id: string
  name: string
  direction: "inbound" | "outbound"
  protocol: string
  port: string
  source: string
  action: "allow" | "deny"
  enabled: boolean
  immutable: boolean
  securityGroup: string
  createdBy: string
  createdAt: string
}

const mockRules: FirewallRule[] = [
  {
    id: "rule-001",
    name: "SSH Access",
    direction: "inbound",
    protocol: "TCP",
    port: "22",
    source: "0.0.0.0/0",
    action: "allow",
    enabled: true,
    immutable: true,
    securityGroup: "Web Servers",
    createdBy: "System",
    createdAt: "2026-01-01",
  },
  {
    id: "rule-002",
    name: "HTTPS Traffic",
    direction: "inbound",
    protocol: "TCP",
    port: "443",
    source: "0.0.0.0/0",
    action: "allow",
    enabled: true,
    immutable: false,
    securityGroup: "Web Servers",
    createdBy: "Admin",
    createdAt: "2026-01-15",
  },
  {
    id: "rule-003",
    name: "HTTP Traffic",
    direction: "inbound",
    protocol: "TCP",
    port: "80",
    source: "0.0.0.0/0",
    action: "allow",
    enabled: true,
    immutable: false,
    securityGroup: "Web Servers",
    createdBy: "Admin",
    createdAt: "2026-01-15",
  },
  {
    id: "rule-004",
    name: "MySQL Access",
    direction: "inbound",
    protocol: "TCP",
    port: "3306",
    source: "10.0.0.0/8",
    action: "allow",
    enabled: true,
    immutable: true,
    securityGroup: "Database Servers",
    createdBy: "System",
    createdAt: "2026-01-01",
  },
  {
    id: "rule-005",
    name: "Redis Access",
    direction: "inbound",
    protocol: "TCP",
    port: "6379",
    source: "10.0.0.0/8",
    action: "allow",
    enabled: true,
    immutable: true,
    securityGroup: "Database Servers",
    createdBy: "System",
    createdAt: "2026-01-01",
  },
  {
    id: "rule-006",
    name: "Block Suspicious IP",
    direction: "inbound",
    protocol: "All",
    port: "All",
    source: "185.143.223.0/24",
    action: "deny",
    enabled: true,
    immutable: false,
    securityGroup: "Web Servers",
    createdBy: "Admin",
    createdAt: "2026-02-08",
  },
  {
    id: "rule-007",
    name: "SMTP",
    direction: "inbound",
    protocol: "TCP",
    port: "25",
    source: "0.0.0.0/0",
    action: "allow",
    enabled: true,
    immutable: true,
    securityGroup: "Web Servers",
    createdBy: "System",
    createdAt: "2026-01-01",
  },
  {
    id: "rule-008",
    name: "SMTPS",
    direction: "inbound",
    protocol: "TCP",
    port: "465",
    source: "0.0.0.0/0",
    action: "allow",
    enabled: true,
    immutable: true,
    securityGroup: "Web Servers",
    createdBy: "System",
    createdAt: "2026-01-01",
  },
  {
    id: "rule-009",
    name: "Submission",
    direction: "inbound",
    protocol: "TCP",
    port: "587",
    source: "0.0.0.0/0",
    action: "allow",
    enabled: true,
    immutable: true,
    securityGroup: "Web Servers",
    createdBy: "System",
    createdAt: "2026-01-01",
  },
  {
    id: "rule-010",
    name: "Custom API",
    direction: "inbound",
    protocol: "TCP",
    port: "8443",
    source: "10.0.0.0/8",
    action: "allow",
    enabled: false,
    immutable: false,
    securityGroup: "Monitoring",
    createdBy: "John Doe",
    createdAt: "2026-02-05",
  },
  {
    id: "rule-011",
    name: "All Outbound",
    direction: "outbound",
    protocol: "All",
    port: "All",
    source: "0.0.0.0/0",
    action: "allow",
    enabled: true,
    immutable: false,
    securityGroup: "Web Servers",
    createdBy: "Admin",
    createdAt: "2026-01-15",
  },
]

export default function FirewallRulesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Firewall Rules</h1>
          <p className="text-muted-foreground">
            Manage inbound and outbound firewall rules across all security groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Firewall Rule</DialogTitle>
                <DialogDescription>
                  Create a new inbound or outbound firewall rule
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input placeholder="e.g., Allow HTTPS" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select defaultValue="inbound">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select defaultValue="allow">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">Allow</SelectItem>
                        <SelectItem value="deny">Deny</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Protocol</Label>
                    <Select defaultValue="tcp">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                        <SelectItem value="icmp">ICMP</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Port / Range</Label>
                    <Input placeholder="e.g., 443 or 8000-9000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Source / Destination CIDR</Label>
                  <Input placeholder="e.g., 0.0.0.0/0 or 10.0.0.0/8" />
                </div>
                <div className="space-y-2">
                  <Label>Security Group</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Servers</SelectItem>
                      <SelectItem value="db">Database Servers</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setCreateOpen(false)}>Add Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rules, ports, IPs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
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
            <Select value={actionFilter} onValueChange={setActionFilter}>
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

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
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
                  <TableHead className="w-[50px]" />
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
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rule.port}</code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rule.source}</code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.action === "allow" ? "default" : "destructive"}
                        className={rule.action === "allow" ? "bg-green-600" : ""}
                      >
                        {rule.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.securityGroup}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        disabled={rule.immutable}
                        aria-label="Toggle rule"
                      />
                    </TableCell>
                    <TableCell>
                      {!rule.immutable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
