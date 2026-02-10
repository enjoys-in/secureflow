import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Lock, ShieldAlert, Info, Server } from "lucide-react"

interface ProtectedPort {
  port: number
  protocol: string
  service: string
  description: string
  reason: string
  category: "system" | "mail" | "database"
}

const protectedPorts: ProtectedPort[] = [
  {
    port: 22,
    protocol: "TCP",
    service: "SSH",
    description: "Secure Shell - Remote server access",
    reason: "Required for server administration. Closing this port locks you out of the server.",
    category: "system",
  },
  {
    port: 25,
    protocol: "TCP",
    service: "SMTP",
    description: "Simple Mail Transfer Protocol",
    reason: "Required for email delivery between mail servers.",
    category: "mail",
  },
  {
    port: 465,
    protocol: "TCP",
    service: "SMTPS",
    description: "SMTP over SSL/TLS",
    reason: "Required for secure email submission.",
    category: "mail",
  },
  {
    port: 587,
    protocol: "TCP",
    service: "Submission",
    description: "Mail Submission Agent",
    reason: "Required for authenticated email submission from mail clients.",
    category: "mail",
  },
  {
    port: 3306,
    protocol: "TCP",
    service: "MySQL",
    description: "MySQL Database Server",
    reason: "Required for MySQL/MariaDB database connections.",
    category: "database",
  },
  {
    port: 6379,
    protocol: "TCP",
    service: "Redis",
    description: "Redis In-Memory Data Store",
    reason: "Required for Redis cache and message broker connections.",
    category: "database",
  },
]

const categoryColors = {
  system: "bg-blue-500",
  mail: "bg-purple-500",
  database: "bg-orange-500",
}

const categoryLabels = {
  system: "System",
  mail: "Mail",
  database: "Database",
}

export default function ImmutablePortsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Protected Ports</h1>
        <p className="text-muted-foreground">
          System-level immutable ports that cannot be modified or closed by any user
        </p>
      </div>

      {/* Warning Alert */}
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>These ports are permanently protected</AlertTitle>
        <AlertDescription>
          The following ports are enforced at the system level and cannot be removed, disabled, or
          modified by any user — including administrators. This ensures critical services remain
          accessible at all times.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Ports</CardTitle>
            <Server className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground mt-1">Port 22 (SSH)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mail Ports</CardTitle>
            <Lock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">Ports 25, 465, 587</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Database Ports</CardTitle>
            <Lock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">Ports 3306, 6379</p>
          </CardContent>
        </Card>
      </div>

      {/* Ports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Immutable Port Rules</CardTitle>
          <CardDescription>
            These rules are applied automatically and enforced before any user-defined rules
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Port</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {protectedPorts.map((port) => (
                <TableRow key={port.port} className="bg-muted/20">
                  <TableCell>
                    <Lock className="h-4 w-4 text-amber-500" />
                  </TableCell>
                  <TableCell>
                    <code className="text-sm font-bold bg-muted px-2 py-0.5 rounded">
                      {port.port}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">{port.protocol}</TableCell>
                  <TableCell className="font-medium text-sm">{port.service}</TableCell>
                  <TableCell>
                    <Badge className={`${categoryColors[port.category]} text-white`}>
                      {categoryLabels[port.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{port.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{port.reason}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      Always Open
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info */}
      <Alert variant="default">
        <Info className="h-4 w-4" />
        <AlertTitle>How protected ports work</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Protected ports are defined in the system configuration and enforced at the firewall
            syscall layer. They are applied before any user-defined security group rules.
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 mt-2">
            <li>Cannot be removed via API, CLI, or UI</li>
            <li>Cannot be overridden by any OpenFGA role (including admin)</li>
            <li>Applied atomically during firewall rule application</li>
            <li>Validated at both API middleware and firewall manager layer</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
