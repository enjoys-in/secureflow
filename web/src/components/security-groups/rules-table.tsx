import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Lock, Plus, Pencil, Trash2, Check, X } from "lucide-react"
import type { SecurityGroupRule } from "@/types"
import { logActivity } from "@/types"

const RULE_TYPES = [
  "SSH", "HTTP", "HTTPS", "Custom TCP", "Custom UDP",
  "MySQL", "PostgreSQL", "Redis", "DNS", "SMTP", "All Traffic",
]

const PROTOCOLS = ["TCP", "UDP", "ICMP", "All"]

const EMPTY_RULE: Omit<SecurityGroupRule, "id"> = {
  type: "",
  protocol: "TCP",
  portRange: "",
  source: "",
  description: "",
}

interface RulesTableProps {
  rules: SecurityGroupRule[]
  direction: "inbound" | "outbound"
  sourceLabel: string
  onAddRule: (rule: SecurityGroupRule) => void
  onEditRule: (rule: SecurityGroupRule) => void
  onDeleteRule: (id: string) => void
}

export function RulesTable({
  rules,
  direction,
  sourceLabel,
  onAddRule,
  onEditRule,
  onDeleteRule,
}: RulesTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<SecurityGroupRule | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newRule, setNewRule] = useState<Omit<SecurityGroupRule, "id">>(EMPTY_RULE)

  const startEditing = (rule: SecurityGroupRule) => {
    if (rule.immutable) return
    setEditingId(rule.id)
    setEditingRule({ ...rule })
  }

  const cancelAll = () => {
    setEditingId(null)
    setEditingRule(null)
    setIsAdding(false)
    setNewRule(EMPTY_RULE)
  }

  const saveEdit = () => {
    if (!editingRule) return
    onEditRule(editingRule)
    setEditingId(null)
    setEditingRule(null)
    logActivity({
      timestamp: new Date().toISOString(),
      page: "SecurityGroups",
      action: "EDIT_RULE",
      data: { direction, rule: editingRule },
    })
  }

  const handleAdd = () => {
    if (!newRule.type || !newRule.portRange || !newRule.source) return
    const id = `${direction === "inbound" ? "r" : "o"}${Date.now()}`
    const rule: SecurityGroupRule = { ...newRule, id }
    onAddRule(rule)
    setIsAdding(false)
    setNewRule(EMPTY_RULE)
    logActivity({
      timestamp: new Date().toISOString(),
      page: "SecurityGroups",
      action: "ADD_RULE",
      data: { direction, rule },
    })
  }

  const handleDelete = (id: string) => {
    onDeleteRule(id)
    logActivity({
      timestamp: new Date().toISOString(),
      page: "SecurityGroups",
      action: "DELETE_RULE",
      data: { direction, ruleId: id },
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {direction === "inbound" ? "Inbound" : "Outbound"} traffic rules for
          instances associated with this security group
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => {
            cancelAll()
            setIsAdding(true)
          }}
        >
          <Plus className="h-3 w-3" /> Add Rule
        </Button>
      </div>

      <div className="border overflow-y-auto max-h-[400px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Port Range</TableHead>
              <TableHead>{sourceLabel}</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) =>
              editingId === rule.id && editingRule ? (
                <React.Fragment key={rule.id}>
                  <EditableRow
                    rule={editingRule}
                    onChange={(field, value) =>
                      setEditingRule({ ...editingRule, [field]: value })
                    }
                    onSave={saveEdit}
                    onCancel={cancelAll}
                  />
                </React.Fragment>
              ) : (
                <TableRow key={rule.id} className="group">
                  <TableCell className="font-medium">
                    {rule.type}
                    {rule.immutable && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs border-amber-500 text-amber-600"
                      >
                        <Lock className="mr-1 h-3 w-3" />
                        Protected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{rule.protocol}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5">
                      {rule.portRange}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5">
                      {rule.source}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        {rule.description}
                      </span>
                      {!rule.immutable && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => startEditing(rule)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={() => handleDelete(rule.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}
            {isAdding && (
              <EditableRow
                rule={newRule}
                onChange={(field, value) =>
                  setNewRule((prev) => ({ ...prev, [field]: value }))
                }
                onSave={handleAdd}
                onCancel={cancelAll}
              />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---- Inline editable row ----

interface EditableRowProps {
  rule: Omit<SecurityGroupRule, "id">
  onChange: (field: string, value: string) => void
  onSave: () => void
  onCancel: () => void
}

function EditableRow({ rule, onChange, onSave, onCancel }: EditableRowProps) {
  return (
    <TableRow className="bg-muted/20">
      <TableCell>
        <Select value={rule.type} onValueChange={(v) => onChange("type", v)}>
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {RULE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={rule.protocol}
          onValueChange={(v) => onChange("protocol", v)}
        >
          <SelectTrigger className="h-8 text-xs w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROTOCOLS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs w-[80px]"
          placeholder="e.g. 443"
          value={rule.portRange}
          onChange={(e) => onChange("portRange", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs w-[130px]"
          placeholder="0.0.0.0/0"
          value={rule.source}
          onChange={(e) => onChange("source", e.target.value)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Input
            className="h-8 text-xs w-[120px]"
            placeholder="Description"
            value={rule.description}
            onChange={(e) => onChange("description", e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-500 hover:text-emerald-400"
            onClick={onSave}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
