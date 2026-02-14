import { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  ShieldBan,
  ShieldCheck,
} from "lucide-react"
import {
  listBlockedIPs,
  blockIPs,
  unblockIPs,
  reblockIP,
  type BlockedIPDTO,
} from "@/lib/handlers"

// ---- IP Validation ----

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
const CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/

function isValidIpOrCidr(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  if (CIDR_RE.test(trimmed)) {
    const [ip, prefix] = trimmed.split("/")
    const prefixNum = Number(prefix)
    if (prefixNum < 0 || prefixNum > 32) return false
    return ip.split(".").every((o) => {
      const n = Number(o)
      return n >= 0 && n <= 255
    })
  }

  if (IPV4_RE.test(trimmed)) {
    return trimmed.split(".").every((o) => {
      const n = Number(o)
      return n >= 0 && n <= 255
    })
  }

  return false
}

function parseIpInput(raw: string): { valid: string[]; invalid: string[] } {
  // Split by comma, space, newline, semicolon, or tab
  const tokens = raw
    .split(/[,\s;]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  for (const token of tokens) {
    if (seen.has(token)) continue
    seen.add(token)
    if (isValidIpOrCidr(token)) {
      valid.push(token)
    } else {
      invalid.push(token)
    }
  }

  return { valid, invalid }
}

// ---- Page ----

export default function BlockedIpsPage() {
  const [blockedIps, setBlockedIps] = useState<BlockedIPDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [blockedCount, setBlockedCount] = useState(0)
  const [unblockedCount, setUnblockedCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [ipInput, setIpInput] = useState("")
  const [reason, setReason] = useState("")
  const [parseResult, setParseResult] = useState<{ valid: string[]; invalid: string[] } | null>(null)

  // Unblock dialog state
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false)
  const [unblockInput, setUnblockInput] = useState("")
  const [unblockResult, setUnblockResult] = useState<{ valid: string[]; invalid: string[] } | null>(null)

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await listBlockedIPs({ status: "all", limit: 200, offset: 0 }, signal)
      setBlockedIps(data.blocked_ips ?? [])
      setBlockedCount(data.blocked_count)
      setUnblockedCount(data.unblocked_count)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "CanceledError") {
        console.error("Failed to fetch blocked IPs:", err)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    fetchData(ac.signal)
    return () => ac.abort()
  }, [fetchData])

  const filteredIps = blockedIps.filter((entry) => {
    const matchesSearch =
      !searchQuery ||
      entry.ip.includes(searchQuery) ||
      entry.reason.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activelyBlocked = blockedCount
  const totalUnblocked = unblockedCount

  // ---- Block IPs ----
  const handleIpInputChange = (value: string) => {
    setIpInput(value)
    if (value.trim()) {
      setParseResult(parseIpInput(value))
    } else {
      setParseResult(null)
    }
  }

  const handleBlockSubmit = async () => {
    if (!parseResult || parseResult.valid.length === 0) return

    try {
      await blockIPs({ ips: parseResult.valid, reason: reason.trim() || "Manual block" })
      await fetchData()
    } catch (err) {
      console.error("Failed to block IPs:", err)
    }

    setBlockDialogOpen(false)
    setIpInput("")
    setReason("")
    setParseResult(null)
  }

  // ---- Unblock IPs ----
  const handleUnblockInputChange = (value: string) => {
    setUnblockInput(value)
    if (value.trim()) {
      setUnblockResult(parseIpInput(value))
    } else {
      setUnblockResult(null)
    }
  }

  const handleUnblockSubmit = async () => {
    if (!unblockResult || unblockResult.valid.length === 0) return

    try {
      await unblockIPs({ ips: unblockResult.valid })
      await fetchData()
    } catch (err) {
      console.error("Failed to unblock IPs:", err)
    }

    setUnblockDialogOpen(false)
    setUnblockInput("")
    setUnblockResult(null)
  }

  const handleUnblockSingle = async (id: string) => {
    try {
      await unblockIPs({ id })
      await fetchData()
    } catch (err) {
      console.error("Failed to unblock IP:", err)
    }
  }

  const handleReblock = async (id: string) => {
    try {
      await reblockIP(id)
      await fetchData()
    } catch (err) {
      console.error("Failed to re-block IP:", err)
    }
  }

  // Matched IPs for bulk unblock preview
  const matchedUnblockIps = useMemo(() => {
    if (!unblockResult) return []
    return unblockResult.valid.filter((ip) =>
      blockedIps.some((e) => e.ip === ip && e.status === "blocked")
    )
  }, [unblockResult, blockedIps])

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header — static */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Blocked IPs</h1>
          <p className="text-[13px] text-muted-foreground">
            Block and unblock IP addresses — supports single IPs and CIDR ranges
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          {/* Unblock Dialog */}
          <Dialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Unblock IPs
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Unblock IP Addresses</DialogTitle>
                <DialogDescription>
                  Enter IPs to unblock. Separate with commas, spaces, or newlines.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>IP Addresses</Label>
                  <Textarea
                    placeholder={"192.168.1.100, 10.0.0.5\n203.0.113.10 45.33.32.156"}
                    rows={4}
                    className="font-mono text-sm"
                    value={unblockInput}
                    onChange={(e) => handleUnblockInputChange(e.target.value)}
                  />
                </div>
                {unblockResult && (
                  <div className="space-y-2">
                    {unblockResult.valid.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {unblockResult.valid.map((ip) => {
                          const isBlocked = blockedIps.some(
                            (e) => e.ip === ip && e.status === "blocked"
                          )
                          return (
                            <Badge
                              key={ip}
                              variant="secondary"
                              className={
                                isBlocked
                                  ? "border-green-500 text-green-500"
                                  : "border-gray-500 text-gray-400"
                              }
                            >
                              {ip}
                              {!isBlocked && (
                                <span className="ml-1 text-[10px]">(not blocked)</span>
                              )}
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    {unblockResult.invalid.length > 0 && (
                      <div className="flex items-start gap-2 text-red-500 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>
                          Invalid: {unblockResult.invalid.join(", ")}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {matchedUnblockIps.length} IP(s) will be unblocked
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUnblockDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUnblockSubmit}
                  disabled={matchedUnblockIps.length === 0}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" /> Unblock {matchedUnblockIps.length} IP(s)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Block Dialog */}
          <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white">
                <ShieldBan className="h-4 w-4" /> Block IPs
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Block IP Addresses</DialogTitle>
                <DialogDescription>
                  Enter one or more IPs / CIDR ranges. Separate with commas, spaces, or newlines.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>IP Addresses / CIDR</Label>
                  <Textarea
                    placeholder={"185.143.223.45, 10.0.0.0/8\n203.0.113.10 45.33.32.156"}
                    rows={4}
                    className="font-mono text-sm"
                    value={ipInput}
                    onChange={(e) => handleIpInputChange(e.target.value)}
                  />
                </div>

                {/* Live validation preview */}
                {parseResult && (
                  <div className="space-y-2">
                    {parseResult.valid.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parseResult.valid.map((ip) => {
                          const alreadyBlocked = blockedIps.some(
                            (e) => e.ip === ip && e.status === "blocked"
                          )
                          return (
                            <Badge
                              key={ip}
                              variant="secondary"
                              className={
                                alreadyBlocked
                                  ? "border-amber-500 text-amber-500"
                                  : "border-green-500 text-green-500"
                              }
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {ip}
                              {alreadyBlocked && (
                                <span className="ml-1 text-[10px]">(exists)</span>
                              )}
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    {parseResult.invalid.length > 0 && (
                      <div className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/5 p-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-red-500">Invalid entries:</p>
                          <p className="text-xs text-red-400 font-mono">
                            {parseResult.invalid.join(", ")}
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {parseResult.valid.length} valid · {parseResult.invalid.length} invalid
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    placeholder="e.g. Brute-force attempts, DDoS source..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleBlockSubmit}
                  disabled={!parseResult || parseResult.valid.length === 0}
                >
                  <Ban className="mr-2 h-4 w-4" /> Block{" "}
                  {parseResult?.valid.length ?? 0} IP(s)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats — static */}
      <div className="grid gap-4 md:grid-cols-3 shrink-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle>
            <ShieldBan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedIps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actively Blocked</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{activelyBlocked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unblocked</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{totalUnblocked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters — static */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search IP or reason..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="unblocked">Unblocked</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredIps.length} of {blockedIps.length} entries
        </div>
      </div>

      {/* Table — scrollable */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading blocked IPs…</span>
            </div>
          ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>IP / CIDR</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Blocked By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIps.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                      {entry.ip}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                    {entry.reason}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        entry.status === "blocked"
                          ? "border-red-500 text-red-500"
                          : "border-green-500 text-green-500"
                      }
                    >
                      {entry.status === "blocked" ? (
                        <Ban className="mr-1 h-3 w-3" />
                      ) : (
                        <ShieldCheck className="mr-1 h-3 w-3" />
                      )}
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.blocked_by_name || entry.blocked_by_email || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    <Clock className="inline mr-1 h-3 w-3" />
                    {new Date(entry.blocked_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {entry.status === "blocked" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-green-500 hover:text-green-400 gap-1"
                        onClick={() => handleUnblockSingle(entry.id)}
                      >
                        <ShieldCheck className="h-3 w-3" /> Unblock
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-500 hover:text-red-400 gap-1"
                        onClick={() => handleReblock(entry.id)}
                      >
                        <Ban className="h-3 w-3" /> Re-block
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
