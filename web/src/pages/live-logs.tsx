import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { logActivity } from "@/types"
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
  RefreshCw,
} from "lucide-react"
import { useWebSocket, type WSEvent } from "@/contexts/websocket-context"


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

const MAX_LOGS = 500

function wsEventToLog(event: WSEvent, id: number): LogEntry | null {
  if (!event.action) return null
  return {
    id,
    timestamp: (event.timestamp || new Date().toISOString()).replace("T", " ").substring(0, 19),
    srcIp: event.src_ip || "—",
    dstIp: event.dst_ip || "—",
    protocol: (event.protocol || "TCP").toUpperCase(),
    port: event.port || 0,
    action: (event.action as "ACCEPT" | "DROP" | "REJECT") || "ACCEPT",
    direction: event.type === "traffic" ? "IN" : "IN",
    ruleId: event.rule_id || "—",
    bytes: 0,
  }
}

export default function LiveLogsPage() {
  const { status, retryCount, subscribe, reconnect } = useWebSocket()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterAction, setFilterAction] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef(1)
  const isStreamingRef = useRef(true)

  // Keep ref in sync so the subscribe callback always reads latest value
  useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  useEffect(() => {
    logActivity({ timestamp: new Date().toISOString(), page: "LiveLogs", action: "PAGE_VIEW" })
  }, [])

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribe = subscribe((event: WSEvent) => {
      if (!isStreamingRef.current) return // paused — ignore incoming events

      const log = wsEventToLog(event, counterRef.current++)
      if (!log) return

      setLogs((prev) => {
        const next = [...prev, log]
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
      })
    })

    return unsubscribe
  }, [subscribe])

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
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header — static */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Real-Time Logs</h1>
          <p className="text-[13px] text-muted-foreground">
            Live firewall traffic stream — monitor packets in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === "disconnected" && (
            <Button variant="outline" size="sm" onClick={reconnect}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Reconnect{retryCount > 0 && ` (${retryCount})`}
            </Button>
          )}
          <Badge
            variant="outline"
            className={
              status === "connected"
                ? isStreaming
                  ? "border-green-500 text-green-600"
                  : "border-amber-500 text-amber-600"
                : status === "connecting"
                  ? "border-blue-500 text-blue-500"
                  : "border-red-500 text-red-500"
            }
          >
            {status === "connected" ? (
              isStreaming ? (
                <>
                  <Wifi className="mr-1 h-3 w-3" /> Live
                </>
              ) : (
                <>
                  <Pause className="mr-1 h-3 w-3" /> Paused
                </>
              )
            ) : status === "connecting" ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Connecting
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" /> Disconnected
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Stats — static */}
      <div className="grid gap-4 md:grid-cols-4 shrink-0">
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

      {/* Controls — static */}
      <Card className="shrink-0">
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

      {/* Log Stream — fills remaining height, scrollable */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto font-mono text-xs"
          >
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10 border-b">
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
