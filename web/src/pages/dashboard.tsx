import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Network, Users, ScrollText, Lock, AlertTriangle, ArrowUpRight } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

const stats = [
  {
    title: "Security Groups",
    value: "12",
    change: "+2",
    trend: "up" as const,
    icon: ShieldCheck,
    description: "Active groups",
  },
  {
    title: "Firewall Rules",
    value: "84",
    change: "+7",
    trend: "up" as const,
    icon: Network,
    description: "Total rules applied",
  },
  {
    title: "Protected Ports",
    value: "6",
    change: "",
    trend: "neutral" as const,
    icon: Lock,
    description: "Immutable ports",
  },
  {
    title: "Team Members",
    value: "8",
    change: "+1",
    trend: "up" as const,
    icon: Users,
    description: "Active members",
  },
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
  { id: 5, user: "Admin", action: "Invited member: bob@example.com", time: "2 hours ago", type: "invite" },
]

const alerts = [
  { id: 1, message: "High traffic detected on port 443", severity: "warning" },
  { id: 2, message: "3 failed login attempts from 10.0.0.5", severity: "error" },
  { id: 3, message: "Security group 'Database' has no rules", severity: "info" },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your firewall infrastructure</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {stat.trend === "up" && (
                    <span className="text-green-600 flex items-center">
                      <ArrowUpRight className="h-3 w-3" /> {stat.change}
                    </span>
                  )}

                  {stat.trend === "neutral" && <span>{stat.change}</span>}
                  {" "}{stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Traffic Chart + Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Network Traffic</CardTitle>
            <CardDescription>Allowed vs blocked requests over 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="allowed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="blocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Area
                    type="monotone"
                    dataKey="allowed"
                    stroke="hsl(142, 76%, 36%)"
                    fillOpacity={1}
                    fill="url(#allowed)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="hsl(0, 84%, 60%)"
                    fillOpacity={1}
                    fill="url(#blocked)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-600" />
                <span className="text-muted-foreground">Allowed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Blocked</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </CardTitle>
            <CardDescription>Recent security alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <AlertTriangle
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    alert.severity === "error"
                      ? "text-red-500"
                      : alert.severity === "warning"
                        ? "text-yellow-500"
                        : "text-blue-500"
                  }`}
                />
                <div className="space-y-1">
                  <p className="text-sm leading-tight">{alert.message}</p>
                  <Badge
                    variant={alert.severity === "error" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest actions performed in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {activity.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">by {activity.user}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
