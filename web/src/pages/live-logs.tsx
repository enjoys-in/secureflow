import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Radio,
  Pause,
  Play,
  Trash2,
  Download,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Filter,
  Wifi,
  WifiOff,
} from "lucide-react"

interface LogEntry {
  id: number
  timestamp: string
  srcIp: string
  dstIp: string
  protocol: string
  port: number
  action: "ACCEPT" | "DROP" | "REJECT"
  direction: "IN" | "OUT"
  ruleId: string
  bytes: number
}

const protocols = ["TCP", "UDP", "ICMP"]
const actions: ("ACCEPT" | "DROP" | "REJECT")[] = ["ACCEPT", "DROP", "REJECT"]
const sampleIps = [
  "192.168.1.5",
  "10.0.0.15",
  "172.16.0.50",
  "185.143.223.45",
  "203.0.113.10",
  "8.8.8.8",
  "1.1.1.1",
  "93.184.216.34",
  "198.51.100.22",
  "45.33.32.156",
]
const samplePorts = [22, 25, 80, 443, 465, 587, 3306, 6379, 8080, 8443, 9090, 53]
const ruleIds = [
  "rule-001",
  "rule-002",
  "rule-003",
  "rule-004",
  "rule-005",
  "rule-006",
  "rule-010",
  "rule-011",
  "default",
]

function generateLog(id: number): LogEntry {
  const now = new Date()
  return {
    id,
    timestamp: now.toISOString().replace("T", " ").substring(0, 19),
    srcIp: sampleIps[Math.floor(Math.random() * sampleIps.length)],
    dstIp: sampleIps[Math.floor(Math.random() * sampleIps.length)],
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    port: samplePorts[Math.floor(Math.random() * samplePorts.length)],
    action: actions[Math.floor(Math.random() * 10) < 7 ? 0 : Math.floor(Math.random() * 2) + 1],
    direction: Math.random() > 0.3 ? "IN" : "OUT",
    ruleId: ruleIds[Math.floor(Math.random() * ruleIds.length)],
    bytes: Math.floor(Math.random() * 65536),
  }
}

export default function LiveLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    Array.from({ length: 20 }, (_, i) => generateLog(i + 1))
  )
  const [isStreaming, setIsStreaming] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterAction, setFilterAction] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef(21)

  useEffect(() => {
    if (!isStreaming) return
    const interval = setInterval(() => {
      const newLog = generateLog(counterRef.current++)
      setLogs((prev) => [...prev.slice(-200), newLog])
    }, 800)
    return () => clearInterval(interval)
  }, [isStreaming])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === "all" || log.action === filterAction
    const matchesSearch =
      !searchQuery ||
      log.srcIp.includes(searchQuery) ||
      log.dstIp.includes(searchQuery) ||
      log.ruleId.includes(searchQuery) ||
      String(log.port).includes(searchQuery)
    return matchesAction && matchesSearch
  })

  const acceptCount = logs.filter((l) => l.action === "ACCEPT").length
  const dropCount = logs.filter((l) => l.action === "DROP").length
  const rejectCount = logs.filter((l) => l.action === "REJECT").length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Real-Time Logs</h1>
          <p className="text-muted-foreground">
            Live firewall traffic stream — monitor packets in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              isStreaming
                ? "border-green-500 text-green-600"
                : "border-red-500 text-red-500"
            }
          >
            {isStreaming ? (
              <>
                <Wifi className="mr-1 h-3 w-3" /> Live
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" /> Paused
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Packets</p>
              <p className="text-xl font-bold">{logs.length}</p>
            </div>
            <Radio className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Accepted</p>
              <p className="text-xl font-bold text-green-600">{acceptCount}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ArrowDownToLine className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dropped</p>
              <p className="text-xl font-bold text-red-500">{dropCount}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ArrowUpFromLine className="h-4 w-4 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-xl font-bold text-amber-500">{rejectCount}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ArrowUpFromLine className="h-4 w-4 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant={isStreaming ? "destructive" : "default"}
              size="sm"
              onClick={() => setIsStreaming(!isStreaming)}
            >
              {isStreaming ? (
                <>
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> Resume
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLogs([])
                counterRef.current = 1
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter IP, port, rule..."
                className="pl-10 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[130px] h-9">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ACCEPT">Accept</SelectItem>
                <SelectItem value="DROP">Drop</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="autoscroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
              <Label htmlFor="autoscroll" className="text-sm">
                Auto-scroll
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Stream */}
      <Card>
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="h-[500px] overflow-y-auto font-mono text-xs"
          >
            <table className="w-full">
              <thead className="sticky top-0 bg-card border-b">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Dir</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Source IP</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Dest IP</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Proto</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Port</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Rule</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Bytes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b border-border/50 hover:bg-muted/50 ${
                      log.action === "DROP"
                        ? "bg-red-50/50 dark:bg-red-950/10"
                        : log.action === "REJECT"
                          ? "bg-amber-50/50 dark:bg-amber-950/10"
                          : ""
                    }`}
                  >
                    <td className="px-4 py-1.5 text-muted-foreground whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {log.direction}
                      </Badge>
                    </td>
                    <td className="px-4 py-1.5">{log.srcIp}</td>
                    <td className="px-4 py-1.5">{log.dstIp}</td>
                    <td className="px-4 py-1.5">{log.protocol}</td>
                    <td className="px-4 py-1.5">{log.port}</td>
                    <td className="px-4 py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.action === "ACCEPT"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                            : log.action === "DROP"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-muted-foreground">{log.ruleId}</td>
                    <td className="px-4 py-1.5 text-muted-foreground">{log.bytes.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
