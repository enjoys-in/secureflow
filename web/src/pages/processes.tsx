import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Search,
  RefreshCw,
  Loader2,
  Cpu,
  MemoryStick,
  Activity,
  Wifi,
} from "lucide-react"
import { listProcesses, type ProcessDTO } from "@/lib/handlers"

function formatMemory(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${(kb / (1024 * 1024)).toFixed(2)} GB`
}

function cpuColor(pct: number): string {
  if (pct >= 80) return "text-red-500"
  if (pct >= 40) return "text-amber-500"
  return "text-emerald-500"
}

function memColor(pct: number): string {
  if (pct >= 50) return "text-red-500"
  if (pct >= 20) return "text-amber-500"
  return "text-emerald-500"
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<ProcessDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [osName, setOsName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"cpu" | "memory" | "pid" | "name">("cpu")
  const [filterType, setFilterType] = useState("all")

  const fetchProcesses = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await listProcesses(signal)
      setProcesses(data.processes ?? [])
      setOsName(data.os)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "CanceledError") {
        console.error("Failed to fetch processes:", err)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    fetchProcesses(ac.signal)
    return () => ac.abort()
  }, [fetchProcesses])

  // Derived stats
  const totalCPU = processes.reduce((a, p) => a + p.cpu_percent, 0)
  const totalMemKB = processes.reduce((a, p) => a + p.memory_rss_kb, 0)
  const withPorts = processes.filter((p) => p.listening_ports && p.listening_ports.length > 0)

  // Filter & sort
  const filtered = processes
    .filter((p) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        String(p.pid).includes(q) ||
        p.user.toLowerCase().includes(q) ||
        p.command.toLowerCase().includes(q)

      if (filterType === "listening") return matchesSearch && p.listening_ports && p.listening_ports.length > 0
      if (filterType === "high-cpu") return matchesSearch && p.cpu_percent >= 10
      if (filterType === "high-mem") return matchesSearch && p.memory_percent >= 5
      return matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "cpu": return b.cpu_percent - a.cpu_percent
        case "memory": return b.memory_rss_kb - a.memory_rss_kb
        case "pid": return a.pid - b.pid
        case "name": return a.name.localeCompare(b.name)
        default: return 0
      }
    })

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Running Processes</h1>
          <p className="text-[13px] text-muted-foreground">
            View all running processes with CPU, memory, and listening ports {osName && `(${osName})`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchProcesses()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 shrink-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Processes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cpuColor(totalCPU / (processes.length || 1) * 10)}`}>
              {totalCPU.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Memory</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMemory(totalMemKB)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Listening</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{withPorts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shrink-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search PID, name, user, command..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processes</SelectItem>
                <SelectItem value="listening">Listening Only</SelectItem>
                <SelectItem value="high-cpu">High CPU (&ge;10%)</SelectItem>
                <SelectItem value="high-mem">High Memory (&ge;5%)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpu">Sort: CPU</SelectItem>
                <SelectItem value="memory">Sort: Memory</SelectItem>
                <SelectItem value="pid">Sort: PID</SelectItem>
                <SelectItem value="name">Sort: Name</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filtered.length} of {processes.length} processes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Table */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading processes…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Activity className="h-10 w-10 mb-2" />
              <p>No processes found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[80px]">PID</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-[90px] text-right">CPU %</TableHead>
                  <TableHead className="w-[90px] text-right">MEM %</TableHead>
                  <TableHead className="w-[100px] text-right">RSS</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Listening Ports</TableHead>
                  <TableHead>Command</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.pid}>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{p.pid}</code>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{p.name}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.user || "—"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-mono font-medium ${cpuColor(p.cpu_percent)}`}>
                        {p.cpu_percent.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-mono font-medium ${memColor(p.memory_percent)}`}>
                        {p.memory_percent.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground font-mono">
                      {formatMemory(p.memory_rss_kb)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.state || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.listening_ports && p.listening_ports.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.listening_ports.map((port) => (
                            <Badge key={port} variant="secondary" className="text-xs font-mono">
                              {port}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground truncate block max-w-[250px] cursor-help">
                            {p.command}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-md">
                          <code className="text-xs break-all">{p.command}</code>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
