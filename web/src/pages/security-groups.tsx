import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import type { SecurityGroup, SecurityGroupRule } from "@/types"
import { logActivity } from "@/types"
import {
  GroupCard,
  CreateGroupDialog,
  DetailPanel,
} from "@/components/security-groups"

// ---- Mock data (will be replaced by API calls) ----

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

// ---- Page ----

export default function SecurityGroupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [groups, setGroups] = useState<SecurityGroup[]>(initialGroups)
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroup | null>(null)
  const [inboundRules, setInboundRules] = useState<SecurityGroupRule[]>(initialInboundRules)
  const [outboundRules, setOutboundRules] = useState<SecurityGroupRule[]>(initialOutboundRules)

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleGroupSelect = (group: SecurityGroup) => {
    setSelectedGroup(group)
    logActivity({
      timestamp: new Date().toISOString(),
      page: "SecurityGroups",
      action: "VIEW_GROUP",
      data: { groupId: group.id, groupName: group.name },
    })
  }

  const handleCreateGroup = (name: string, description: string) => {
    const newGroup: SecurityGroup = {
      id: `sg-${String(groups.length + 1).padStart(3, "0")}`,
      name,
      description,
      rulesCount: 0,
      serversAttached: 0,
      createdBy: "Admin",
      createdAt: new Date().toISOString().slice(0, 10),
      status: "active",
    }
    setGroups((prev) => [...prev, newGroup])
    setSelectedGroup(newGroup)
    logActivity({
      timestamp: new Date().toISOString(),
      page: "SecurityGroups",
      action: "CREATE_GROUP",
      data: newGroup,
    })
  }

  const handleAddRule = (direction: "inbound" | "outbound", rule: SecurityGroupRule) => {
    const setter = direction === "inbound" ? setInboundRules : setOutboundRules
    setter((prev) => [...prev, rule])
  }

  const handleEditRule = (direction: "inbound" | "outbound", rule: SecurityGroupRule) => {
    const setter = direction === "inbound" ? setInboundRules : setOutboundRules
    setter((prev) => prev.map((r) => (r.id === rule.id ? rule : r)))
  }

  const handleDeleteRule = (direction: "inbound" | "outbound", id: string) => {
    const setter = direction === "inbound" ? setInboundRules : setOutboundRules
    setter((prev) => prev.filter((r) => r.id !== id))
  }

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
        <CreateGroupDialog onCreateGroup={handleCreateGroup} />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              logActivity({
                timestamp: new Date().toISOString(),
                page: "SecurityGroups",
                action: "SEARCH",
                data: { query: e.target.value },
              })
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

      {/* Two-panel layout — both panels scroll independently */}
      <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {/* Groups List — scrollable */}
        <div className="lg:col-span-1 overflow-y-auto space-y-3 pr-1">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isSelected={selectedGroup?.id === group.id}
              onSelect={handleGroupSelect}
            />
          ))}
        </div>

        {/* Detail Panel — scrollable */}
        <div className="lg:col-span-2 overflow-hidden">
          <DetailPanel
            group={selectedGroup}
            inboundRules={inboundRules}
            outboundRules={outboundRules}
            onAddRule={handleAddRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
          />
        </div>
      </div>
    </div>
  )
}
