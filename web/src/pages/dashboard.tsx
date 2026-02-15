import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Network, Users, ScrollText, Lock, AlertTriangle, TrendingUp, Ban, Activity, Wifi, WifiOff } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { logActivity } from "@/types"
import { getDashboardStats, getDashboardRecentActivity, type DashboardStatsDTO, type RecentActivityDTO } from "@/lib/handlers"
import { useWebSocket, type WSEvent } from "@/contexts/websocket-context"

// ---- Traffic bucket for the live chart ----
interface TrafficBucket {
  time: string
  allowed: number
  blocked: number
}

const MAX_BUCKETS = 30 // 30 data points on the chart
const BUCKET_INTERVAL_MS = 5_000 // aggregate every 5 seconds

// Format audit action into a human-readable string
function formatAction(action: string, resource: string, details: string): string {
  const labels: Record<string, string> = {
    add_rule: "Added rule",
    delete_rule: "Deleted rule",
    create_security_group: "Created security group",
    update_security_group: "Updated security group",
    delete_security_group: "Deleted security group",
    apply_security_group: "Applied security group",
    invite_user: "Invited user",
    accept_invite: "Accepted invite",
    register: "Registered",
    login: "Logged in",
    add_immutable_port: "Added immutable port",
    delete_immutable_port: "Deleted immutable port",
    block_ip: "Blocked IP",
    unblock_ip: "Unblocked IP",
  }

  const label = labels[action] || action.replace(/_/g, " ")
  if (details) return `${label}: ${details}`
  if (resource) return `${label} — ${resource}`
  return label
}

// Time-ago formatter
function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardPage() {
  const { status, subscribe } = useWebSocket()

  // ---- API-driven state ----
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null)
  const [activity, setActivity] = useState<RecentActivityDTO[]>([])
  const [loading, setLoading] = useState(true)

  // ---- WebSocket-driven realtime traffic state ----
  const [trafficData, setTrafficData] = useState<TrafficBucket[]>([])
  const [totalAllowed, setTotalAllowed] = useState(0)
  const [totalBlocked, setTotalBlocked] = useState(0)

  // Accumulator ref for current bucket
  const bucketRef = useRef({ allowed: 0, blocked: 0 })

  // Fetch dashboard data from API
  const fetchData = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([getDashboardStats(), getDashboardRecentActivity()])
      setStats(s)
      setActivity(a)
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    logActivity({ timestamp: new Date().toISOString(), page: "Dashboard", action: "PAGE_VIEW" })
    fetchData()
    // Re-fetch stats every 30s
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Subscribe to WebSocket traffic events for realtime chart
  useEffect(() => {
    const unsubscribe = subscribe((event: WSEvent) => {
      if (event.type !== "traffic") return
      const isBlocked = event.action === "DROP" || event.action === "REJECT"
      if (isBlocked) {
        bucketRef.current.blocked++
        setTotalBlocked((p) => p + 1)
      } else {
        bucketRef.current.allowed++
        setTotalAllowed((p) => p + 1)
      }
    })
    return unsubscribe
  }, [subscribe])

  // Flush the bucket into chart data on an interval
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      const snap = { ...bucketRef.current }
      bucketRef.current = { allowed: 0, blocked: 0 }

      setTrafficData((prev) => {
        const next = [...prev, { time: label, allowed: snap.allowed, blocked: snap.blocked }]
        return next.length > MAX_BUCKETS ? next.slice(-MAX_BUCKETS) : next
      })
    }, BUCKET_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  // Build stat cards from real data
  const statCards = stats
    ? [
        { title: "Security Groups", value: stats.security_groups, icon: ShieldCheck, description: "Active groups" },
        { title: "Firewall Rules", value: stats.firewall_rules, icon: Network, description: `${stats.inbound_rules} in / ${stats.outbound_rules} out` },
        { title: "Protected Ports", value: stats.immutable_ports, icon: Lock, description: "Immutable ports" },
        { title: "Team Members", value: stats.team_members, icon: Users, description: "Registered users" },
      ]
    : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground">Overview of your firewall infrastructure</p>
        </div>
        <Badge
          variant="outline"
          className={
            status === "connected"
              ? "border-green-500 text-green-600"
              : status === "connecting"
                ? "border-blue-500 text-blue-500"
                : "border-red-500 text-red-500"
          }
        >
          {status === "connected" ? (
            <><Wifi className="mr-1 h-3 w-3" /> Live</>
          ) : status === "connecting" ? (
            <><Activity className="mr-1 h-3 w-3 animate-spin" /> Connecting</>
          ) : (
            <><WifiOff className="mr-1 h-3 w-3" /> Offline</>
          )}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border animate-pulse">
                <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded" /></CardHeader>
                <CardContent><div className="h-8 w-12 bg-muted rounded" /></CardContent>
              </Card>
            ))
          : statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[13px] font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <div className="h-8 w-8 flex items-center justify-center bg-[#ff9900]/10">
                      <Icon className="h-4 w-4 text-[#ff9900]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">{stat.description}</p>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {/* Realtime Traffic Chart + Live Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              Network Traffic
              {status === "connected" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-[12px]">
              Live traffic — aggregated every 5 seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trafficData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <Activity className="mr-2 h-4 w-4 animate-pulse" />
                  Waiting for traffic data…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="allowed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="blocked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e5484d" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#e5484d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262d2a" />
                    <XAxis dataKey="time" tick={{ fill: "#7a8580", fontSize: 11 }} axisLine={{ stroke: "#262d2a" }} tickLine={false} />
                    <YAxis tick={{ fill: "#7a8580", fontSize: 11 }} axisLine={{ stroke: "#262d2a" }} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 4, fontSize: 12 }}
                      labelStyle={{ color: "#7a8580" }}
                    />
                    <Area type="monotone" dataKey="allowed" stroke="#4ade80" fillOpacity={1} fill="url(#allowed)" strokeWidth={2} name="Allowed" />
                    <Area type="monotone" dataKey="blocked" stroke="#e5484d" fillOpacity={1} fill="url(#blocked)" strokeWidth={2} name="Blocked" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-6 mt-4 text-[12px]">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 bg-emerald-400" />
                <span className="text-muted-foreground">Allowed ({totalAllowed})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 bg-red-400" />
                <span className="text-muted-foreground">Blocked ({totalBlocked})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Summary */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <AlertTriangle className="h-4 w-4 text-[#ff9900]" />
              Live Summary
            </CardTitle>
            <CardDescription className="text-[12px]">Realtime traffic overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 border border-border p-3 bg-muted/30">
              <TrendingUp className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
              <div className="space-y-1">
                <p className="text-[13px] leading-tight font-medium">{totalAllowed + totalBlocked} total packets</p>
                <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">session total</Badge>
              </div>
            </div>
            <div className="flex items-start gap-3 border border-border p-3 bg-muted/30">
              <Network className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
              <div className="space-y-1">
                <p className="text-[13px] leading-tight">{totalAllowed} accepted</p>
                <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">allowed</Badge>
              </div>
            </div>
            <div className="flex items-start gap-3 border border-border p-3 bg-muted/30">
              <Ban className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
              <div className="space-y-1">
                <p className="text-[13px] leading-tight">{totalBlocked} blocked</p>
                <Badge variant="destructive" className="text-[10px] font-semibold uppercase tracking-wide">dropped/rejected</Badge>
              </div>
            </div>
            {stats && stats.blocked_ips > 0 && (
              <div className="flex items-start gap-3 border border-border p-3 bg-muted/30">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#ff9900]" />
                <div className="space-y-1">
                  <p className="text-[13px] leading-tight">{stats.blocked_ips} IPs blocked</p>
                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">firewall</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - from audit logs API */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-[12px]">Latest actions performed in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted/20 animate-pulse rounded" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between border border-border p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center bg-[#ff9900] text-white text-[11px] font-semibold shrink-0">
                      {item.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{formatAction(item.action, item.resource, item.details)}</p>
                      <p className="text-[11px] text-muted-foreground">by {item.user_name}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-4">{timeAgo(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
