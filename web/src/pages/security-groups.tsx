import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Plus,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Pencil,
  Trash2,
  Copy,
  Server,
  Network,
} from "lucide-react"

interface SecurityGroup {
  id: string
  name: string
  description: string
  rulesCount: number
  serversAttached: number
  createdBy: string
  createdAt: string
  status: "active" | "inactive"
}

interface InboundRule {
  id: string
  type: string
  protocol: string
  portRange: string
  source: string
  description: string
}

const mockGroups: SecurityGroup[] = [
  {
    id: "sg-001",
    name: "Web Servers",
    description: "Security group for web-facing servers",
    rulesCount: 5,
    serversAttached: 3,
    createdBy: "Admin",
    createdAt: "2026-01-15",
    status: "active",
  },
  {
    id: "sg-002",
    name: "Database Servers",
    description: "Restricted access for database tier",
    rulesCount: 3,
    serversAttached: 2,
    createdBy: "Admin",
    createdAt: "2026-01-20",
    status: "active",
  },
  {
    id: "sg-003",
    name: "Monitoring",
    description: "Monitoring and observability stack",
    rulesCount: 8,
    serversAttached: 5,
    createdBy: "John Doe",
    createdAt: "2026-02-01",
    status: "active",
  },
  {
    id: "sg-004",
    name: "Development",
    description: "Dev environment - relaxed rules",
    rulesCount: 12,
    serversAttached: 1,
    createdBy: "Jane Smith",
    createdAt: "2026-02-05",
    status: "inactive",
  },
]

const mockInboundRules: InboundRule[] = [
  { id: "r1", type: "SSH", protocol: "TCP", portRange: "22", source: "0.0.0.0/0", description: "SSH Access (Immutable)" },
  { id: "r2", type: "HTTP", protocol: "TCP", portRange: "80", source: "0.0.0.0/0", description: "HTTP Traffic" },
  { id: "r3", type: "HTTPS", protocol: "TCP", portRange: "443", source: "0.0.0.0/0", description: "HTTPS Traffic" },
  { id: "r4", type: "Custom TCP", protocol: "TCP", portRange: "8080", source: "10.0.0.0/8", description: "Internal API" },
  { id: "r5", type: "MySQL", protocol: "TCP", portRange: "3306", source: "10.0.0.0/8", description: "MySQL (Immutable)" },
]

const mockOutboundRules: InboundRule[] = [
  { id: "o1", type: "All Traffic", protocol: "All", portRange: "All", source: "0.0.0.0/0", description: "Allow all outbound" },
]

export default function SecurityGroupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroup | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filteredGroups = mockGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Groups</h1>
          <p className="text-muted-foreground">
            Manage security groups and their inbound/outbound rules — like AWS VPC Security Groups
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Security Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Security Group</DialogTitle>
              <DialogDescription>
                Define a new security group with inbound and outbound rules
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sg-name">Name</Label>
                <Input id="sg-name" placeholder="e.g., Web Servers" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-desc">Description</Label>
                <Textarea id="sg-desc" placeholder="Describe the purpose of this security group" />
              </div>
              <div className="space-y-2">
                <Label>VPS / Server</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select server to attach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vps-1">vps-1 (192.168.1.10)</SelectItem>
                    <SelectItem value="vps-2">vps-2 (192.168.1.20)</SelectItem>
                    <SelectItem value="vps-3">vps-3 (10.0.0.5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateOpen(false)}>Create</Button>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Two-panel layout: Groups list + Detail view */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Groups List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                selectedGroup?.id === group.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedGroup(group)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{group.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{group.id}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <Badge variant={group.status === "active" ? "default" : "secondary"}>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      {selectedGroup.name}
                    </CardTitle>
                    <CardDescription>
                      {selectedGroup.id} · Created by {selectedGroup.createdBy} on{" "}
                      {selectedGroup.createdAt}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="inbound">
                  <TabsList className="mb-4">
                    <TabsTrigger value="inbound">Inbound Rules</TabsTrigger>
                    <TabsTrigger value="outbound">Outbound Rules</TabsTrigger>
                    <TabsTrigger value="servers">Attached Servers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="inbound" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Control inbound traffic to instances associated with this security group
                      </p>
                      <Button size="sm">
                        <Plus className="mr-2 h-3 w-3" />
                        Add Rule
                      </Button>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Protocol</TableHead>
                            <TableHead>Port Range</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[50px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockInboundRules.map((rule) => {
                            const isImmutable = rule.description.includes("Immutable")
                            return (
                              <TableRow key={rule.id}>
                                <TableCell className="font-medium">
                                  {rule.type}
                                  {isImmutable && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Protected
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>{rule.protocol}</TableCell>
                                <TableCell>{rule.portRange}</TableCell>
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {rule.source}
                                  </code>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {rule.description}
                                </TableCell>
                                <TableCell>
                                  {!isImmutable && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="outbound" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Control outbound traffic from instances associated with this security group
                      </p>
                      <Button size="sm">
                        <Plus className="mr-2 h-3 w-3" />
                        Add Rule
                      </Button>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Protocol</TableHead>
                            <TableHead>Port Range</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[50px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockOutboundRules.map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell className="font-medium">{rule.type}</TableCell>
                              <TableCell>{rule.protocol}</TableCell>
                              <TableCell>{rule.portRange}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {rule.source}
                                </code>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {rule.description}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="servers" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Servers currently using this security group
                      </p>
                      <Button size="sm">
                        <Plus className="mr-2 h-3 w-3" />
                        Attach Server
                      </Button>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Server</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">vps-1</TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">192.168.1.10</code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-600">Running</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">vps-2</TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">192.168.1.20</code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-600">Running</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
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
