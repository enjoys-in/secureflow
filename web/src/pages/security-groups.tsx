import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  ShieldCheck,
  Network,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Zap,
  Lock,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  listSecurityGroups,
  createSecurityGroup,
  deleteSecurityGroup,
  getSecurityGroup,
  addRuleToGroup,
  deleteRuleFromGroup,
  applySecurityGroup,
  type SecurityGroupDTO,
  type FirewallRuleDTO,
  type AddRulePayload,
} from "@/lib/handlers"

// ---- Page ----

export default function SecurityGroupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [groups, setGroups] = useState<SecurityGroupDTO[]>([])
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroupDTO | null>(null)
  const [inboundRules, setInboundRules] = useState<FirewallRuleDTO[]>([])
  const [outboundRules, setOutboundRules] = useState<FirewallRuleDTO[]>([])

  const [loading, setLoading] = useState(true)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listSecurityGroups()
      setGroups(data ?? [])
    } catch (err) {
      console.error("Failed to fetch security groups", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Fetch rules for selected group
  const fetchGroupRules = useCallback(async (groupId: string) => {
    try {
      setRulesLoading(true)
      const data = await getSecurityGroup(groupId)
      const rules = data.rules ?? []
      setInboundRules(rules.filter((r) => r.direction === "inbound"))
      setOutboundRules(rules.filter((r) => r.direction === "outbound"))
    } catch (err) {
      console.error("Failed to fetch group rules", err)
    } finally {
      setRulesLoading(false)
    }
  }, [])

  const handleGroupSelect = (group: SecurityGroupDTO) => {
    setSelectedGroup(group)
    fetchGroupRules(group.id)
  }

  const handleCreateGroup = async (name: string, description: string) => {
    try {
      await createSecurityGroup({ name, description })
      await fetchGroups()
    } catch (err) {
      console.error("Failed to create security group", err)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await deleteSecurityGroup(id)
      if (selectedGroup?.id === id) {
        setSelectedGroup(null)
        setInboundRules([])
        setOutboundRules([])
      }
      await fetchGroups()
    } catch (err) {
      console.error("Failed to delete security group", err)
    }
  }

  const handleAddRule = async (
    direction: "inbound" | "outbound",
    rule: Omit<AddRulePayload, "security_group_id" | "direction">
  ) => {
    if (!selectedGroup) return
    try {
      await addRuleToGroup(selectedGroup.id, {
        ...rule,
        direction,
        security_group_id: selectedGroup.id,
      })
      await fetchGroupRules(selectedGroup.id)
      await fetchGroups() // refresh counts
    } catch (err) {
      console.error("Failed to add rule", err)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedGroup) return
    try {
      await deleteRuleFromGroup(selectedGroup.id, ruleId)
      await fetchGroupRules(selectedGroup.id)
      await fetchGroups()
    } catch (err) {
      console.error("Failed to delete rule", err)
    }
  }

  const handleApply = async () => {
    if (!selectedGroup) return
    try {
      setApplying(true)
      const result = await applySecurityGroup(selectedGroup.id)
      alert(`Applied ${result.rules_count} rules to firewall`)
    } catch (err) {
      console.error("Failed to apply security group", err)
    } finally {
      setApplying(false)
    }
  }

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Security Groups</h1>
          <p className="text-[13px] text-muted-foreground">
            Manage security groups and their inbound/outbound rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchGroups}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <CreateGroupDialog onCreateGroup={handleCreateGroup} />
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="text-xs">
          {groups.length} group{groups.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {/* Groups List */}
        <div className="lg:col-span-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchQuery ? "No groups match your search" : "No security groups yet. Create one to get started."}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                isSelected={selectedGroup?.id === group.id}
                onSelect={handleGroupSelect}
                onDelete={handleDeleteGroup}
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 overflow-hidden">
          <DetailPanel
            group={selectedGroup}
            inboundRules={inboundRules}
            outboundRules={outboundRules}
            rulesLoading={rulesLoading}
            applying={applying}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
            onApply={handleApply}
          />
        </div>
      </div>
    </div>
  )
}

// ---- Group Card ----

function GroupCard({
  group,
  isSelected,
  onSelect,
  onDelete,
}: {
  group: SecurityGroupDTO
  isSelected: boolean
  onSelect: (group: SecurityGroupDTO) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "ring-2 ring-[#ff9900]" : ""}`}
      onClick={() => onSelect(group)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#ff9900] shrink-0" />
              <span className="font-semibold text-sm truncate">{group.name}</span>
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground truncate">{group.description}</p>
            )}
            {group.created_by_name && (
              <p className="text-xs text-muted-foreground">
                by {group.created_by_name}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-red-400 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm("Delete this security group and all its rules?")) {
                onDelete(group.id)
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Network className="h-3 w-3" /> {group.rule_count} rules
          </span>
          <span className="flex items-center gap-1">
            <ArrowDownToLine className="h-3 w-3" /> {group.inbound_count} in
          </span>
          <span className="flex items-center gap-1">
            <ArrowUpFromLine className="h-3 w-3" /> {group.outbound_count} out
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Create Group Dialog ----

function CreateGroupDialog({ onCreateGroup }: { onCreateGroup: (name: string, description: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    await onCreateGroup(name.trim(), description.trim())
    setCreating(false)
    setOpen(false)
    setName("")
    setDescription("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-[#ff9900] hover:bg-[#ec7211] text-white">
          <Plus className="h-4 w-4" /> Create Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Security Group</DialogTitle>
          <DialogDescription>
            Add a new security group to organize your firewall rules.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sg-name">Group Name</Label>
            <Input
              id="sg-name"
              placeholder="e.g. Web Servers"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-desc">Description</Label>
            <Textarea
              id="sg-desc"
              placeholder="What is this security group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#ff9900] hover:bg-[#ec7211] text-white"
            onClick={handleCreate}
            disabled={!name.trim() || creating}
          >
            {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Detail Panel ----

function DetailPanel({
  group,
  inboundRules,
  outboundRules,
  rulesLoading,
  applying,
  onAddRule,
  onDeleteRule,
  onApply,
}: {
  group: SecurityGroupDTO | null
  inboundRules: FirewallRuleDTO[]
  outboundRules: FirewallRuleDTO[]
  rulesLoading: boolean
  applying: boolean
  onAddRule: (direction: "inbound" | "outbound", rule: Omit<AddRulePayload, "security_group_id" | "direction">) => void
  onDeleteRule: (ruleId: string) => void
  onApply: () => void
}) {
  if (!group) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">Select a security group to view its details</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#ff9900]" />
              {group.name}
            </CardTitle>
            <CardDescription>
              {group.description || "No description"} &middot; Created by{" "}
              {group.created_by_name || "Unknown"} &middot;{" "}
              {new Date(group.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onApply}
            disabled={applying}
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Apply to Firewall
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="inbound" className="flex flex-col h-full">
          <TabsList className="mb-4 shrink-0">
            <TabsTrigger value="inbound">
              Inbound Rules ({inboundRules.length})
            </TabsTrigger>
            <TabsTrigger value="outbound">
              Outbound Rules ({outboundRules.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbound" className="flex-1 overflow-y-auto mt-0">
            <RulesPanel
              rules={inboundRules}
              direction="inbound"
              loading={rulesLoading}
              onAddRule={(rule) => onAddRule("inbound", rule)}
              onDeleteRule={onDeleteRule}
            />
          </TabsContent>

          <TabsContent value="outbound" className="flex-1 overflow-y-auto mt-0">
            <RulesPanel
              rules={outboundRules}
              direction="outbound"
              loading={rulesLoading}
              onAddRule={(rule) => onAddRule("outbound", rule)}
              onDeleteRule={onDeleteRule}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ---- Rules Panel ----

const PROTOCOLS = ["tcp", "udp", "icmp", "all"]
const ACTIONS = ["ACCEPT", "DROP", "REJECT"]

function RulesPanel({
  rules,
  direction,
  loading,
  onAddRule,
  onDeleteRule,
}: {
  rules: FirewallRuleDTO[]
  direction: "inbound" | "outbound"
  loading: boolean
  onAddRule: (rule: Omit<AddRulePayload, "security_group_id" | "direction">) => void
  onDeleteRule: (ruleId: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [protocol, setProtocol] = useState("tcp")
  const [port, setPort] = useState("")
  const [portEnd, setPortEnd] = useState("")
  const [sourceCidr, setSourceCidr] = useState("0.0.0.0/0")
  const [destCidr, setDestCidr] = useState("")
  const [action, setAction] = useState("ACCEPT")
  const [description, setDescription] = useState("")
  const [adding, setAdding] = useState(false)

  const resetForm = () => {
    setProtocol("tcp")
    setPort("")
    setPortEnd("")
    setSourceCidr("0.0.0.0/0")
    setDestCidr("")
    setAction("ACCEPT")
    setDescription("")
    setShowAdd(false)
  }

  const handleAdd = async () => {
    const portNum = parseInt(port, 10)
    if (isNaN(portNum)) return

    setAdding(true)
    await onAddRule({
      protocol,
      port: portNum,
      port_range_end: portEnd ? parseInt(portEnd, 10) : undefined,
      source_cidr: sourceCidr,
      dest_cidr: destCidr || undefined,
      action,
      description: description || undefined,
    })
    setAdding(false)
    resetForm()
  }

  const sourceLabel = direction === "inbound" ? "Source" : "Destination"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {direction === "inbound" ? "Inbound" : "Outbound"} traffic rules for this security group
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-3 w-3" /> Add Rule
        </Button>
      </div>

      {/* Add rule form */}
      {showAdd && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Protocol</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Port</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. 443"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Port End (range)</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. 8080"
                value={portEnd}
                onChange={(e) => setPortEnd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{sourceLabel} CIDR</Label>
              <Input
                className="h-8 text-xs"
                placeholder="0.0.0.0/0"
                value={sourceCidr}
                onChange={(e) => setSourceCidr(e.target.value)}
              />
            </div>
            {direction === "outbound" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Dest CIDR</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="0.0.0.0/0"
                  value={destCidr}
                  onChange={(e) => setDestCidr(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-[#ff9900] hover:bg-[#ec7211] text-white"
              disabled={!port || adding}
              onClick={handleAdd}
            >
              {adding && <Loader2 className="h-3 w-3 animate-spin" />}
              Add Rule
            </Button>
          </div>
        </Card>
      )}

      {/* Rules table */}
      <div className="border overflow-y-auto max-h-[400px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Protocol</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>{sourceLabel}</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                  No {direction} rules yet. Click "Add Rule" to create one.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id} className="group">
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {rule.protocol.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {rule.port}
                      {rule.port_range_end ? `-${rule.port_range_end}` : ""}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {direction === "inbound" ? rule.source_cidr || "*" : rule.dest_cidr || rule.source_cidr || "*"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        rule.action === "ACCEPT"
                          ? "bg-emerald-600 text-white"
                          : rule.action === "DROP"
                          ? "bg-red-600 text-white"
                          : "bg-amber-600 text-white"
                      }
                    >
                      {rule.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      {rule.is_immutable && (
                        <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                      {rule.description || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {!rule.is_immutable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
