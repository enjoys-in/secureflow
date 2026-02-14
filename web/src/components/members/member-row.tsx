import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { Shield, Eye, Pencil, Crown } from "lucide-react"
import type { MemberDTO } from "@/lib/handlers"

const roleConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  owner: { color: "bg-amber-600", icon: <Crown className="mr-1 h-3 w-3" /> },
  admin: { color: "bg-red-500", icon: <Shield className="mr-1 h-3 w-3" /> },
  editor: { color: "bg-blue-500", icon: <Pencil className="mr-1 h-3 w-3" /> },
  viewer: { color: "bg-gray-500", icon: <Eye className="mr-1 h-3 w-3" /> },
}

interface MemberRowProps {
  member: MemberDTO
}

export function MemberRow({ member }: MemberRowProps) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")

  const primaryRole = member.roles?.[0] ?? "viewer"

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
          {member.roles && member.roles.length > 0 ? (
            member.roles.map((role) => {
              const cfg = roleConfig[role] ?? roleConfig.viewer
              return (
                <Badge
                  key={role}
                  className={`${cfg.color} text-white text-[10px] px-1.5 py-0`}
                >
                  {cfg.icon}
                  {role}
                </Badge>
              )
            })
          ) : (
            <Badge className={`${roleConfig.viewer.color} text-white capitalize`}>
              {roleConfig.viewer.icon}
              viewer
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm capitalize">active</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{member.created_at}</TableCell>
      <TableCell>
        <Badge className={`${roleConfig[primaryRole]?.color ?? "bg-gray-500"} text-white capitalize`}>
          {roleConfig[primaryRole]?.icon}
          {primaryRole}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
