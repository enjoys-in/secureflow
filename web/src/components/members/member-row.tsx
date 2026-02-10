import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { Shield, Eye, Pencil, Crown } from "lucide-react"
import type { User, ResourcePermission } from "@/types"

const roleConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  owner: { color: "bg-amber-600", icon: <Crown className="mr-1 h-3 w-3" /> },
  admin: { color: "bg-red-500", icon: <Shield className="mr-1 h-3 w-3" /> },
  editor: { color: "bg-blue-500", icon: <Pencil className="mr-1 h-3 w-3" /> },
  viewer: { color: "bg-gray-500", icon: <Eye className="mr-1 h-3 w-3" /> },
}

const scopeLabels: Record<string, string> = {
  system: "System",
  firewall: "Firewall",
  security_group: "Sec Groups",
}

interface MemberRowProps {
  member: User
  permissions?: ResourcePermission[]
}

export function MemberRow({ member, permissions = [] }: MemberRowProps) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-[#ff9900] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {permissions.length > 0 ? (
            permissions.map((p) => {
              const cfg = roleConfig[p.role] ?? roleConfig.viewer
              return (
                <Badge
                  key={`${p.scope}-${p.role}`}
                  className={`${cfg.color} text-white text-[10px] px-1.5 py-0`}
                >
                  {cfg.icon}
                  {scopeLabels[p.scope]}: {p.role}
                </Badge>
              )
            })
          ) : (
            <Badge className={`${roleConfig[member.role]?.color ?? "bg-gray-500"} text-white capitalize`}>
              {roleConfig[member.role]?.icon}
              {member.role}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <div
            className={`h-2 w-2 rounded-full ${
              member.status === "active" ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-sm capitalize">{member.status}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{member.joinedAt}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{member.lastActive}</TableCell>
    </TableRow>
  )
}
