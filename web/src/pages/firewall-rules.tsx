import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Filter,
  RefreshCw,
  Loader2,
  Wifi,
  Shield,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  listAllRulesWithDetails,
  listListeningPorts,
  listSecurityGroups,
  addFirewallRule,
  updateFirewallRule,
  deleteFirewallRule,
  type FirewallRuleWithDetailsDTO,
  type ListeningPortDTO,
  type SecurityGroupDTO,
  type AddRulePayload,
} from "@/lib/handlers"

// Well-known port names
const KNOWN_PORTS: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
  80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 465: "SMTPS",
  587: "Submission", 993: "IMAPS", 995: "POP3S", 3306: "MySQL",
  5432: "PostgreSQL", 6379: "Redis", 8080: "HTTP Alt", 8443: "HTTPS Alt",
  27017: "MongoDB", 5672: "RabbitMQ", 9200: "Elasticsearch",
  2181: "ZooKeeper", 9092: "Kafka", 6443: "Kubernetes API",
}

function getPortName(port: number, process?: string): string {
  if (process && process !== "" && process !== "unknown") return process
  return KNOWN_PORTS[port] || `Port ${port}`
}

const emptyForm: AddRulePayload = {
  direction: "inbound",
  protocol: "tcp",
  port: 0,
  port_range_end: 0,
  source_cidr: "0.0.0.0/0",
  dest_cidr: "",
  action: "ACCEPT",
  description: "",
  security_group_id: "",
}

export default function FirewallRulesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("rules")

  // DB rules state
  const [rules, setRules] = useState<FirewallRuleWithDetailsDTO[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)

  // System ports state
  const [listeningPorts, setListeningPorts] = useState<ListeningPortDTO[]>([])
  const [portsLoading, setPortsLoading] = useState(true)
  const [osName, setOsName] = useState("")

  // Security groups (for form dropdown)
  const [securityGroups, setSecurityGroups] = useState<SecurityGroupDTO[]>([])

  // CRUD dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<FirewallRuleWithDetailsDTO | null>(null)
  const [form, setForm] = useState<AddRulePayload>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FirewallRuleWithDetailsDTO | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRules = useCallback(async (signal?: AbortSignal) => {
    setRulesLoading(true)
    try {
      const data = await listAllRulesWithDetails({ limit: 200, offset: 0 }, signal)
      setRules(data.rules ?? [])
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "CanceledError") {
        console.error("Failed to fetch rules:", err)
      }
    } finally {
      setRulesLoading(false)
    }
  }, [])

  const fetchPorts = useCallback(async (signal?: AbortSignal) => {
    setPortsLoading(true)
    try {
      const data = await listListeningPorts(signal)
      setListeningPorts(data.listening_ports ?? [])
      setOsName(data.os)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "CanceledError") {
        console.error("Failed to fetch ports:", err)
      }
    } finally {
      setPortsLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    fetchRules(ac.signal)
    fetchPorts(ac.signal)
    listSecurityGroups(ac.signal).then((groups) => setSecurityGroups(groups ?? [])).catch(() => {})
    return () => ac.abort()
  }, [fetchRules, fetchPorts])

  const handleRefresh = () => {
    fetchRules()
    fetchPorts()
  }

  // ---- CRUD handlers ----
  const openAddDialog = () => {
    setEditingRule(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEditDialog = (rule: FirewallRuleWithDetailsDTO) => {
    setEditingRule(rule)
    setForm({
      direction: rule.direction as "inbound" | "outbound",
      protocol: rule.protocol,
      port: rule.port,
      port_range_end: rule.port_range_end ?? 0,
      source_cidr: rule.source_cidr,
      dest_cidr: rule.dest_cidr ?? "",
      action: rule.action,
      description: rule.description ?? "",
      security_group_id: rule.security_group_id ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.port || form.port < 1 || form.port > 65535) {
      toast.error("Port must be between 1 and 65535")
      return
    }
    setSaving(true)
    try {
      if (editingRule) {
        await updateFirewallRule(editingRule.id, form)
        toast.success("Rule updated")
      } else {
        await addFirewallRule(form)
        toast.success("Rule created")
      }
      setDialogOpen(false)
      fetchRules()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save rule"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteFirewallRule(deleteTarget.id)
      toast.success("Rule deleted")
      setDeleteTarget(null)
      fetchRules()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete rule"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  // Filter rules
  const filteredRules = rules.filter((r) => {
    const desc = r.description || ""
    const matchesSearch =
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.port).includes(searchQuery) ||
      r.source_cidr.includes(searchQuery) ||
      r.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.security_group_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDirection = directionFilter === "all" || r.direction === directionFilter
    const matchesAction = actionFilter === "all" || r.action.toLowerCase() === actionFilter
    return matchesSearch && matchesDirection && matchesAction
  })

  // Filter listening ports
  const filteredPorts = listeningPorts.filter((p) => {
    const name = getPortName(p.port, p.process)
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.port).includes(searchQuery) ||
      p.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.includes(searchQuery)
    )
  })

  const isLoading = activeTab === "rules" ? rulesLoading : portsLoading

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Firewall Rules</h1>
          <p className="text-[13px] text-muted-foreground">
            Manage firewall rules and view system listening ports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shrink-0">
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
            {activeTab === "rules" && (
              <>
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
                    <SelectItem value="accept">Accept</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <div className="text-sm text-muted-foreground">
              {activeTab === "rules"
                ? `${filteredRules.length} of ${rules.length} rules`
                : `${filteredPorts.length} of ${listeningPorts.length} ports`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="rules" className="gap-2">
            <Shield className="h-4 w-4" />
            Firewall Rules
          </TabsTrigger>
          <TabsTrigger value="ports" className="gap-2">
            <Wifi className="h-4 w-4" />
            Listening Ports {osName && `(${osName})`}
          </TabsTrigger>
        </TabsList>

        {/* Firewall Rules Tab */}
        <TabsContent value="rules" className="flex-1 min-h-0 mt-4">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {rulesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading rules…</span>
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Shield className="h-10 w-10 mb-2" />
                  <p>No firewall rules found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHead>Description</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Security Group</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => (
                      <TableRow key={rule.id} className={rule.is_immutable ? "bg-muted/30" : ""}>
                        <TableCell>
                          {rule.is_immutable && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">
                              {rule.description || KNOWN_PORTS[rule.port] || `Rule ${rule.id.slice(0, 8)}`}
                            </span>
                            <p className="text-xs text-muted-foreground">{rule.id.slice(0, 8)}…</p>
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
                        <TableCell className="text-sm">{rule.protocol.toUpperCase()}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {rule.port}{rule.port_range_end ? `-${rule.port_range_end}` : ""}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rule.source_cidr || "*"}</code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={["allow", "accept"].includes(rule.action.toLowerCase()) ? "default" : "destructive"}
                            className={["allow", "accept"].includes(rule.action.toLowerCase()) ? "bg-emerald-600" : ""}
                          >
                            {rule.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rule.security_group_name || "—"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm">{rule.created_by_name || "—"}</span>
                            {rule.created_by_email && (
                              <p className="text-xs text-muted-foreground">{rule.created_by_email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!rule.is_immutable && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(rule)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(rule)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Listening Ports Tab */}
        <TabsContent value="ports" className="flex-1 min-h-0 mt-4">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {portsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading listening ports…</span>
                </div>
              ) : filteredPorts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Wifi className="h-10 w-10 mb-2" />
                  <p>No listening ports found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Port</TableHead>
                      <TableHead>Service / Process</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>PID</TableHead>
                      <TableHead>State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPorts.map((p, idx) => (
                      <TableRow key={`${p.port}-${p.protocol}-${idx}`}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{p.port}</code>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{getPortName(p.port, p.process)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.protocol.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.address || "0.0.0.0"}</code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.pid || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                            {p.state}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Update the firewall rule settings below."
                : "Configure a new firewall rule."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select
                  value={form.direction}
                  onValueChange={(v) => setForm({ ...form, direction: v as "inbound" | "outbound" })}
                >
                  <SelectTrigger id="direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select
                  value={form.protocol}
                  onValueChange={(v) => setForm({ ...form, protocol: v })}
                >
                  <SelectTrigger id="protocol">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port || ""}
                  onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 443"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port_range_end">Port Range End</Label>
                <Input
                  id="port_range_end"
                  type="number"
                  min={0}
                  max={65535}
                  value={form.port_range_end || ""}
                  onChange={(e) => setForm({ ...form, port_range_end: parseInt(e.target.value) || 0 })}
                  placeholder="0 = single port"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source_cidr">Source CIDR</Label>
                <Input
                  id="source_cidr"
                  value={form.source_cidr}
                  onChange={(e) => setForm({ ...form, source_cidr: e.target.value })}
                  placeholder="0.0.0.0/0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest_cidr">Dest CIDR</Label>
                <Input
                  id="dest_cidr"
                  value={form.dest_cidr || ""}
                  onChange={(e) => setForm({ ...form, dest_cidr: e.target.value })}
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select
                  value={form.action}
                  onValueChange={(v) => setForm({ ...form, action: v })}
                >
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCEPT">Accept</SelectItem>
                    <SelectItem value="DROP">Drop</SelectItem>
                    <SelectItem value="REJECT">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="security_group">Security Group</Label>
                <Select
                  value={form.security_group_id || "none"}
                  onValueChange={(v) => setForm({ ...form, security_group_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger id="security_group">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {securityGroups.map((sg) => (
                      <SelectItem key={sg.id} value={sg.id}>
                        {sg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this firewall rule? This will remove it from both the
              database and the active firewall. This action cannot be undone.
              {deleteTarget && (
                <span className="block mt-2 font-mono text-xs">
                  {deleteTarget.protocol.toUpperCase()} port {deleteTarget.port} — {deleteTarget.action} ({deleteTarget.direction})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
