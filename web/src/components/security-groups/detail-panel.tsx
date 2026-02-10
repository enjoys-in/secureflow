import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ShieldCheck } from "lucide-react"
import type { SecurityGroup, SecurityGroupRule } from "@/types"
import { RulesTable } from "./rules-table"

interface DetailPanelProps {
  group: SecurityGroup | null
  inboundRules: SecurityGroupRule[]
  outboundRules: SecurityGroupRule[]
  onAddRule: (direction: "inbound" | "outbound", rule: SecurityGroupRule) => void
  onEditRule: (direction: "inbound" | "outbound", rule: SecurityGroupRule) => void
  onDeleteRule: (direction: "inbound" | "outbound", id: string) => void
}

export function DetailPanel({
  group,
  inboundRules,
  outboundRules,
  onAddRule,
  onEditRule,
  onDeleteRule,
}: DetailPanelProps) {
  if (!group) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Select a security group to view its details
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#ff9900]" />
          {group.name}
        </CardTitle>
        <CardDescription>
          {group.id} &middot; Created by {group.createdBy} on {group.createdAt}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="inbound" className="flex flex-col h-full">
          <TabsList className="mb-4 shrink-0">
            <TabsTrigger value="inbound">Inbound Rules</TabsTrigger>
            <TabsTrigger value="outbound">Outbound Rules</TabsTrigger>
            <TabsTrigger value="servers">Attached Servers</TabsTrigger>
          </TabsList>

          <TabsContent value="inbound" className="flex-1 overflow-y-auto mt-0">
            <RulesTable
              rules={inboundRules}
              direction="inbound"
              sourceLabel="Source"
              onAddRule={(rule) => onAddRule("inbound", rule)}
              onEditRule={(rule) => onEditRule("inbound", rule)}
              onDeleteRule={(id) => onDeleteRule("inbound", id)}
            />
          </TabsContent>

          <TabsContent value="outbound" className="flex-1 overflow-y-auto mt-0">
            <RulesTable
              rules={outboundRules}
              direction="outbound"
              sourceLabel="Destination"
              onAddRule={(rule) => onAddRule("outbound", rule)}
              onEditRule={(rule) => onEditRule("outbound", rule)}
              onDeleteRule={(id) => onDeleteRule("outbound", id)}
            />
          </TabsContent>

          <TabsContent value="servers" className="flex-1 overflow-y-auto mt-0">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Servers currently using this security group
              </p>
              <div className="border overflow-y-auto max-h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">vps-1</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5">
                          192.168.1.10
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-600 text-white">
                          Running
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">vps-2</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5">
                          192.168.1.20
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-600 text-white">
                          Running
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
