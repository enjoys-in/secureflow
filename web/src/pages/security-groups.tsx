import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, ShieldCheck, Server, Network, Lock, Plus, Pencil, Trash2, Check, X } from "lucide-react"
import type { SecurityGroup, SecurityGroupRule } from "@/types"
import { logActivity } from "@/types"

const initialGroups: SecurityGroup[] = [
  { id: "sg-001", name: "Web Servers", description: "Security group for web-facing servers", rulesCount: 5, serversAttached: 3, createdBy: "Admin", createdAt: "2026-01-15", status: "active" },
  { id: "sg-002", name: "Database Servers", description: "Restricted access for database tier", rulesCount: 3, serversAttached: 2, createdBy: "Admin", createdAt: "2026-01-20", status: "active" },
  { id: "sg-003", name: "Monitoring", description: "Monitoring and observability stack", rulesCount: 8, serversAttached: 5, createdBy: "John Doe", createdAt: "2026-02-01", status: "active" },
  { id: "sg-004", name: "Development", description: "Dev environment - relaxed rules", rulesCount: 12, serversAttached: 1, createdBy: "Jane Smith", createdAt: "2026-02-05", status: "inactive" },
]

const initialInboundRules: SecurityGroupRule[] = [
  { id: "r1", type: "SSH", protocol: "TCP", portRange: "22", source: "0.0.0.0/0", description: "SSH Access", immutable: true },
  { id: "r2", type: "HTTP", protocol: "TCP", portRange: "80", source: "0.0.0.0/0", description: "HTTP Traffic" },
  { id: "r3", type: "HTTPS", protocol: "TCP", portRange: "443", source: "0.0.0.0/0", description: "HTTPS Traffic" },
  { id: "r4", type: "Custom TCP", protocol: "TCP", portRange: "8080", source: "10.0.0.0/8", description: "Internal API" },
  { id: "r5", type: "MySQL", protocol: "TCP", portRange: "3306", source: "10.0.0.0/8", description: "MySQL", immutable: true },
]

const initialOutboundRules: SecurityGroupRule[] = [
  { id: "o1", type: "All Traffic", protocol: "All", portRange: "All", source: "0.0.0.0/0", description: "Allow all outbound" },
]

const emptyRule: Omit<SecurityGroupRule, "id"> = {
  type: "",
  protocol: "TCP",
  portRange: "",
  source: "",
  description: "",
}

const ruleTypes = ["SSH", "HTTP", "HTTPS", "Custom TCP", "Custom UDP", "MySQL", "PostgreSQL", "Redis", "DNS", "SMTP", "All Traffic"]
const protocols = ["TCP", "UDP", "ICMP", "All"]

export default function SecurityGroupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [groups, setGroups] = useState<SecurityGroup[]>(initialGroups)
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroup | null>(null)
  const [inboundRules, setInboundRules] = useState<SecurityGroupRule[]>(initialInboundRules)
  const [outboundRules, setOutboundRules] = useState<SecurityGroupRule[]>(initialOutboundRules)

  // Inline editing state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<SecurityGroupRule | null>(null)
  const [addingInbound, setAddingInbound] = useState(false)
  const [addingOutbound, setAddingOutbound] = useState(false)
  const [newRule, setNewRule] = useState<Omit<SecurityGroupRule, "id">>(emptyRule)

  // Create group dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDesc, setNewGroupDesc] = useState("")

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleGroupSelect = (group: SecurityGroup) => {
    setSelectedGroup(group)
    cancelEditing()
    logActivity({ timestamp: new Date().toISOString(), page: "SecurityGroups", action: "VIEW_GROUP", data: { groupId: group.id, groupName: group.name } })
  }

  // ---- Create Security Group ----
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return
    const newGroup: SecurityGroup = {
      id: `sg-${String(groups.length + 1).padStart(3, "0")}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      rulesCount: 0,
      serversAttached: 0,
      createdBy: "Admin",
      createdAt: new Date().toISOString().slice(0, 10),
      status: "active",
    }
    setGroups((prev) => [...prev, newGroup])
    setSelectedGroup(newGroup)
    setCreateDialogOpen(false)
    setNewGroupName("")
    setNewGroupDesc("")
    logActivity({ timestamp: new Date().toISOString(), page: "SecurityGroups", action: "CREATE_GROUP", data: newGroup })
  }

  // ---- Inline Add Rule ----
  const handleAddRule = (direction: "inbound" | "outbound") => {
    if (!newRule.type || !newRule.portRange || !newRule.source) return
    const id = `${direction === "inbound" ? "r" : "o"}${Date.now()}`
    const rule: SecurityGroupRule = { ...newRule, id }
    if (direction === "inbound") {
      setInboundRules((prev) => [...prev, rule])
      setAddingInbound(false)
    } else {
      setOutboundRules((prev) => [...prev, rule])
      setAddingOutbound(false)
    }
    setNewRule(emptyRule)
    logActivity({ timestamp: new Date().toISOString(), page: "SecurityGroups", action: "ADD_RULE", data: { direction, rule } })
  }

  // ---- Inline Edit Rule ----
  const startEditing = (rule: SecurityGroupRule) => {
    if (rule.immutable) return
    setEditingRuleId(rule.id)
    setEditingRule({ ...rule })
  }

  const cancelEditing = () => {
    setEditingRuleId(null)
    setEditingRule(null)
    setAddingInbound(false)
    setAddingOutbound(false)
    setNewRule(emptyRule)
  }

  const saveEdit = (direction: "inbound" | "outbound") => {
    if (!editingRule) return
    const setter = direction === "inbound" ? setInboundRules : setOutboundRules
    setter((prev) => prev.map((r) => (r.id === editingRule.id ? editingRule : r)))
    setEditingRuleId(null)
    setEditingRule(null)
    logActivity({ timestamp: new Date().toISOString(), page: "SecurityGroups", action: "EDIT_RULE", data: { direction, rule: editingRule } })
  }

  const deleteRule = (id: string, direction: "inbound" | "outbound") => {
    const setter = direction === "inbound" ? setInboundRules : setOutboundRules
    setter((prev) => prev.filter((r) => r.id !== id))
    logActivity({ timestamp: new Date().toISOString(), page: "SecurityGroups", action: "DELETE_RULE", data: { direction, ruleId: id } })
  }

  // ---- Inline row for new/editing ----
  const renderEditableRow = (
    rule: Omit<SecurityGroupRule, "id">,
    onChange: (field: string, value: string) => void,
    onSave: () => void,
    onCancel: () => void,
    isSource: boolean,
  ) => (
    <TableRow className="bg-muted/20">
      <TableCell>
        <Select value={rule.type} onValueChange={(v) => onChange("type", v)}>
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {ruleTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={rule.protocol} onValueChange={(v) => onChange("protocol", v)}>
          <SelectTrigger className="h-8 text-xs w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {protocols.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs w-[80px]"
          placeholder="e.g. 443"
          value={rule.portRange}
          onChange={(e) => onChange("portRange", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs w-[130px]"
          placeholder={isSource ? "0.0.0.0/0" : "0.0.0.0/0"}
          value={rule.source}
          onChange={(e) => onChange("source", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Input
            className="h-8 text-xs w-[120px]"
            placeholder="Description"
            value={rule.description}
            onChange={(e) => onChange("description", e.target.value)}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-400" onClick={onSave}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  // ---- Render rules table ----
  const renderRulesTable = (
    rules: SecurityGroupRule[],
    direction: "inbound" | "outbound",
    isAdding: boolean,
    setIsAdding: (v: boolean) => void,
    sourceLabel: string,
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {direction === "inbound" ? "Inbound" : "Outbound"} traffic rules for instances associated with this security group
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => {
            setIsAdding(true)
            setNewRule(emptyRule)
          }}
        >
          <Plus className="h-3 w-3" /> Add Rule
        </Button>
      </div>
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Port Range</TableHead>
              <TableHead>{sourceLabel}</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) =>
              editingRuleId === rule.id && editingRule ? (
                <React.Fragment key={rule.id}>
                  {renderEditableRow(
                    editingRule,
                    (field, value) => setEditingRule({ ...editingRule, [field]: value }),
                    () => saveEdit(direction),
                    cancelEditing,
                    direction === "inbound",
                  )}
                </React.Fragment>
              ) : (
                <TableRow key={rule.id} className="group">
                  <TableCell className="font-medium">
                    {rule.type}
                    {rule.immutable && (
                      <Badge variant="outline" className="ml-2 text-xs border-amber-500 text-amber-600">
                        <Lock className="mr-1 h-3 w-3" />Protected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{rule.protocol}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5">{rule.portRange}</code></TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5">{rule.source}</code></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">{rule.description}</span>
                      {!rule.immutable && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEditing(rule)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => deleteRule(rule.id, direction)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}
            {isAdding &&
              renderEditableRow(
                newRule,
                (field, value) => setNewRule((prev) => ({ ...prev, [field]: value })),
                () => handleAddRule(direction),
                () => { setIsAdding(false); setNewRule(emptyRule) },
                direction === "inbound",
              )}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Security Groups</h1>
          <p className="text-[13px] text-muted-foreground">
            Manage security groups and their inbound/outbound rules
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-[#ff9900] hover:bg-[#ec7211] text-white">
              <Plus className="h-4 w-4" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Security Group</DialogTitle>
              <DialogDescription>Add a new security group to organize your firewall rules.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="sg-name">Group Name</Label>
                <Input
                  id="sg-name"
                  placeholder="e.g. Web Servers"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-desc">Description</Label>
                <Textarea
                  id="sg-desc"
                  placeholder="What is this security group for?"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button className="bg-[#ff9900] hover:bg-[#ec7211] text-white" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              logActivity({ timestamp: new Date().toISOString(), page: "SecurityGroups", action: "SEARCH", data: { query: e.target.value } })
            }}
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Groups List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                selectedGroup?.id === group.id ? "ring-2 ring-[#ff9900]" : ""
              }`}
              onClick={() => handleGroupSelect(group)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#ff9900]" />
                      <span className="font-semibold text-sm">{group.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{group.id}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <Badge variant={group.status === "active" ? "default" : "secondary"} className={group.status === "active" ? "bg-emerald-600" : ""}>
                    {group.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Network className="h-3 w-3" /> {group.rulesCount} rules
                  </span>
                  <span className="flex items-center gap-1">
                    <Server className="h-3 w-3" /> {group.serversAttached} servers
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#ff9900]" />
                    {selectedGroup.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedGroup.id} &middot; Created by {selectedGroup.createdBy} on {selectedGroup.createdAt}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="inbound" onValueChange={() => cancelEditing()}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="inbound">Inbound Rules</TabsTrigger>
                    <TabsTrigger value="outbound">Outbound Rules</TabsTrigger>
                    <TabsTrigger value="servers">Attached Servers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="inbound" className="space-y-4">
                    {renderRulesTable(inboundRules, "inbound", addingInbound, setAddingInbound, "Source")}
                  </TabsContent>

                  <TabsContent value="outbound" className="space-y-4">
                    {renderRulesTable(outboundRules, "outbound", addingOutbound, setAddingOutbound, "Destination")}
                  </TabsContent>

                  <TabsContent value="servers" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Servers currently using this security group
                    </p>
                    <div className="border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Server</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">vps-1</TableCell>
                            <TableCell><code className="text-xs bg-muted px-1.5 py-0.5">192.168.1.10</code></TableCell>
                            <TableCell><Badge className="bg-emerald-600 text-white">Running</Badge></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">vps-2</TableCell>
                            <TableCell><code className="text-xs bg-muted px-1.5 py-0.5">192.168.1.20</code></TableCell>
                            <TableCell><Badge className="bg-emerald-600 text-white">Running</Badge></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-[500px]">
              <div className="text-center space-y-2">
                <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a security group to view its details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
