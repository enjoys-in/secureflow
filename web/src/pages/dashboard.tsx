import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Network, Users, ScrollText, Lock, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { logActivity } from "@/types"

const stats = [
  { title: "Security Groups", value: "12", change: "+2.7%", trend: "up" as const, icon: ShieldCheck, description: "Active groups" },
  { title: "Firewall Rules", value: "84", change: "+8.3%", trend: "up" as const, icon: Network, description: "Total applied" },
  { title: "Protected Ports", value: "6", change: "0%", trend: "neutral" as const, icon: Lock, description: "Immutable ports" },
  { title: "Team Members", value: "8", change: "-12.5%", trend: "down" as const, icon: Users, description: "Active members" },
]

const trafficData = [
  { time: "00:00", allowed: 1200, blocked: 45 },
  { time: "02:00", allowed: 800, blocked: 32 },
  { time: "04:00", allowed: 400, blocked: 18 },
  { time: "06:00", allowed: 600, blocked: 25 },
  { time: "08:00", allowed: 2100, blocked: 78 },
  { time: "10:00", allowed: 3400, blocked: 120 },
  { time: "12:00", allowed: 2800, blocked: 95 },
  { time: "14:00", allowed: 3200, blocked: 110 },
  { time: "16:00", allowed: 2900, blocked: 88 },
  { time: "18:00", allowed: 2200, blocked: 65 },
  { time: "20:00", allowed: 1800, blocked: 52 },
  { time: "22:00", allowed: 1400, blocked: 40 },
]

const recentActivity = [
  { id: 1, user: "Admin", action: "Added rule: Allow TCP 443", time: "2 mins ago", type: "create" },
  { id: 2, user: "John Doe", action: "Created security group: Web Servers", time: "15 mins ago", type: "create" },
  { id: 3, user: "Admin", action: "Blocked IP 192.168.1.100", time: "32 mins ago", type: "block" },
  { id: 4, user: "Jane Smith", action: "Removed rule: Block UDP 8080", time: "1 hour ago", type: "delete" },
  { id: 5, user: "Admin", action: "Synced server vps-1", time: "2 hours ago", type: "sync" },
]

const alerts = [
  { id: 1, message: "High traffic detected on port 443", severity: "warning" },
  { id: 2, message: "3 failed login attempts from 10.0.0.5", severity: "error" },
  { id: 3, message: "Security group 'Database' has no rules", severity: "info" },
]

export default function DashboardPage() {
  useEffect(() => {
    logActivity({ timestamp: new Date().toISOString(), page: "Dashboard", action: "PAGE_VIEW" })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground">Overview of your firewall infrastructure</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
                <div className="flex items-center gap-2 mt-1.5">
                  {stat.trend === "up" && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400">
                      <TrendingUp className="h-3 w-3" /> {stat.change}
                    </span>
                  )}
                  {stat.trend === "down" && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 bg-red-500/15 text-red-400">
                      <TrendingDown className="h-3 w-3" /> {stat.change}
                    </span>
                  )}
                  {stat.trend === "neutral" && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 bg-muted text-muted-foreground">
                      <Minus className="h-3 w-3" /> {stat.change}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart + Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-[15px]">Network Traffic</CardTitle>
            <CardDescription className="text-[12px]">Allowed vs blocked requests over 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
                  <YAxis tick={{ fill: "#7a8580", fontSize: 11 }} axisLine={{ stroke: "#262d2a" }} tickLine={false} />
                  <Area type="monotone" dataKey="allowed" stroke="#4ade80" fillOpacity={1} fill="url(#allowed)" strokeWidth={2} />
                  <Area type="monotone" dataKey="blocked" stroke="#e5484d" fillOpacity={1} fill="url(#blocked)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-4 text-[12px]">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 bg-emerald-400" />
                <span className="text-muted-foreground">Allowed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 bg-red-400" />
                <span className="text-muted-foreground">Blocked</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <AlertTriangle className="h-4 w-4 text-[#ff9900]" />
              Alerts
            </CardTitle>
            <CardDescription className="text-[12px]">Recent security alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 border border-border p-3 bg-muted/30">
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${alert.severity === "error" ? "text-red-400" : alert.severity === "warning" ? "text-[#ff9900]" : "text-sky-400"}`} />
                <div className="space-y-1.5">
                  <p className="text-[13px] leading-tight">{alert.message}</p>
                  <Badge variant={alert.severity === "error" ? "destructive" : "secondary"} className="text-[10px] font-semibold uppercase tracking-wide">
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-[12px]">Latest actions performed in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between border border-border p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#ff9900] text-white text-[11px] font-semibold shrink-0">
                    {activity.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{activity.action}</p>
                    <p className="text-[11px] text-muted-foreground">by {activity.user}</p>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-4">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
