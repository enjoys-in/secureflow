import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Filter,
  RefreshCw,
  Loader2,
  Wifi,
  Shield,
} from "lucide-react"
import {
  listAllRulesWithDetails,
  listListeningPorts,
  type FirewallRuleWithDetailsDTO,
  type ListeningPortDTO,
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
    return () => ac.abort()
  }, [fetchRules, fetchPorts])

  const handleRefresh = () => {
    fetchRules()
    fetchPorts()
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
            View firewall rules and system listening ports
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
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
    </div>
  )
}
