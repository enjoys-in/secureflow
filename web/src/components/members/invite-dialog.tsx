import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, X, UserPlus, Shield, Lock, Eye, Pencil, Crown } from "lucide-react"
import { PERMISSION_SCOPES, type ResourcePermission, type ResourceScope } from "@/types"

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="mr-1 h-3 w-3" />,
  admin: <Shield className="mr-1 h-3 w-3" />,
  editor: <Pencil className="mr-1 h-3 w-3" />,
  viewer: <Eye className="mr-1 h-3 w-3" />,
}

const roleColors: Record<string, string> = {
  owner: "bg-amber-600",
  admin: "bg-red-500",
  editor: "bg-blue-500",
  viewer: "bg-gray-500",
}

const scopeLabels: Record<string, string> = {
  system: "System",
  firewall: "Firewall",
  security_group: "Security Groups",
}

interface InviteDialogProps {
  onInvite: (email: string, permissions: ResourcePermission[]) => void
}

export function InviteDialog({ onInvite }: InviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [permissions, setPermissions] = useState<ResourcePermission[]>([])
  const [selectedScope, setSelectedScope] = useState<ResourceScope | "">("")
  const [selectedRole, setSelectedRole] = useState("")

  const availableRoles = selectedScope
    ? PERMISSION_SCOPES.find((s) => s.scope === selectedScope)?.roles ?? []
    : []

  const addPermission = () => {
    if (!selectedScope || !selectedRole) return
    // Prevent duplicates for same scope
    if (permissions.some((p) => p.scope === selectedScope)) return
    setPermissions((prev) => [...prev, { scope: selectedScope as ResourceScope, role: selectedRole }])
    setSelectedScope("")
    setSelectedRole("")
  }

  const removePermission = (scope: string) => {
    setPermissions((prev) => prev.filter((p) => p.scope !== scope))
  }

  const handleSubmit = () => {
    if (!email.trim() || permissions.length === 0) return
    onInvite(email.trim(), permissions)
    setOpen(false)
    setEmail("")
    setPermissions([])
    setSelectedScope("")
    setSelectedRole("")
  }

  const reset = () => {
    setEmail("")
    setPermissions([])
    setSelectedScope("")
    setSelectedRole("")
  }

  // Scopes already assigned
  const usedScopes = new Set(permissions.map((p) => p.scope))

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-[#ff9900] hover:bg-[#ec7211] text-white">
          <UserPlus className="h-4 w-4" /> Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation with scoped permissions based on the OpenFGA authorization model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Add Permission */}
          <div className="space-y-2">
            <Label>Assign Permissions</Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedScope}
                onValueChange={(v) => {
                  setSelectedScope(v as ResourceScope)
                  setSelectedRole("")
                }}
              >
                <SelectTrigger className="flex-1">
                  <Lock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Resource scope" />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_SCOPES.filter((s) => !usedScopes.has(s.scope)).map((s) => (
                    <SelectItem key={s.scope} value={s.scope}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
                disabled={!selectedScope}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center capitalize">
                        {roleIcons[r]} {r}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={addPermission}
                disabled={!selectedScope || !selectedRole}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Assigned permissions */}
          {permissions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Assigned permissions</Label>
              <div className="flex flex-wrap gap-2">
                {permissions.map((p) => (
                  <Badge
                    key={p.scope}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-1"
                  >
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-white ${roleColors[p.role]}`}>
                      {roleIcons[p.role]} {p.role}
                    </span>
                    <span className="text-xs ml-1">{scopeLabels[p.scope]}</span>
                    <button
                      type="button"
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      onClick={() => removePermission(p.scope)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Permission model hint */}
          <div className="rounded border border-dashed p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> OpenFGA Permission Model
            </p>
            <ul className="text-[11px] text-muted-foreground space-y-0.5 ml-4 list-disc">
              <li><strong>System</strong> — owner · admin · editor · viewer</li>
              <li><strong>Firewall</strong> — owner · admin · editor · viewer</li>
              <li><strong>Security Groups</strong> — owner · editor · viewer</li>
            </ul>
            <p className="text-[11px] text-muted-foreground mt-1">
              Higher roles inherit lower permissions (e.g. admin can edit and view).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#ff9900] hover:bg-[#ec7211] text-white"
            onClick={handleSubmit}
            disabled={!email.trim() || permissions.length === 0}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
