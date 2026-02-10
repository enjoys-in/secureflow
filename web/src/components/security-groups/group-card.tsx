import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Network, Server } from "lucide-react"
import type { SecurityGroup } from "@/types"

interface GroupCardProps {
  group: SecurityGroup
  isSelected: boolean
  onSelect: (group: SecurityGroup) => void
}

export function GroupCard({ group, isSelected, onSelect }: GroupCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-accent/50 ${
        isSelected ? "ring-2 ring-[#ff9900]" : ""
      }`}
      onClick={() => onSelect(group)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#ff9900]" />
              <span className="font-semibold text-sm">{group.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{group.id}</p>
            <p className="text-xs text-muted-foreground">{group.description}</p>
          </div>
          <Badge
            variant={group.status === "active" ? "default" : "secondary"}
            className={group.status === "active" ? "bg-emerald-600" : ""}
          >
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
  )
}
