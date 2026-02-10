import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { User, Bell, Server, Shield, Save, RefreshCw, AlertTriangle, Trash2, Plus } from "lucide-react"
import type { ProfilePayload, PasswordPayload } from "@/types"
import { logActivity } from "@/types"

export default function SettingsPage() {
  const profileForm = useForm<ProfilePayload>({
    defaultValues: { firstName: "Admin", lastName: "User", email: "admin@example.com", timezone: "utc" },
  })

  const passwordForm = useForm<PasswordPayload>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const onProfileSubmit = (data: ProfilePayload) => {
    logActivity({ timestamp: new Date().toISOString(), page: "Settings", action: "UPDATE_PROFILE", data })
  }

  const onPasswordSubmit = (_data: PasswordPayload) => {
    logActivity({ timestamp: new Date().toISOString(), page: "Settings", action: "UPDATE_PASSWORD", data: { changed: true } })
    passwordForm.reset()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted-foreground">Manage your account, notifications, and server configuration</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />Security</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="servers"><Server className="mr-2 h-4 w-4" />Servers</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-lg bg-[#ff9900] text-white">AD</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" size="sm">Change Avatar</Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input {...profileForm.register("firstName", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input {...profileForm.register("lastName", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" {...profileForm.register("email", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select defaultValue="utc" onValueChange={(v) => profileForm.setValue("timezone", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">EST (UTC-5)</SelectItem>
                        <SelectItem value="pst">PST (UTC-8)</SelectItem>
                        <SelectItem value="ist">IST (UTC+5:30)</SelectItem>
                        <SelectItem value="cet">CET (UTC+1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="bg-[#ff9900] hover:bg-[#ec7211] text-white">
                    <Save className="mr-2 h-4 w-4" />Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password regularly for security</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label>Current Password</Label>
                  <Input type="password" {...passwordForm.register("currentPassword", { required: "Required" })} />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label>New Password</Label>
                  <Input type="password" {...passwordForm.register("newPassword", { required: "Required", minLength: { value: 8, message: "Min 8 chars" } })} />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label>Confirm New Password</Label>
                  <Input type="password" {...passwordForm.register("confirmPassword", { required: "Required" })} />
                </div>
                <Button type="submit" className="bg-[#ff9900] hover:bg-[#ec7211] text-white">Update Password</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Authenticator App</p>
                  <p className="text-xs text-muted-foreground">Use an authenticator app to generate one-time codes</p>
                </div>
                <Switch onCheckedChange={(v) => logActivity({ timestamp: new Date().toISOString(), page: "Settings", action: "TOGGLE_2FA_APP", data: { enabled: v } })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">SMS Recovery</p>
                  <p className="text-xs text-muted-foreground">Receive recovery codes via SMS</p>
                </div>
                <Switch onCheckedChange={(v) => logActivity({ timestamp: new Date().toISOString(), page: "Settings", action: "TOGGLE_SMS_RECOVERY", data: { enabled: v } })} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() =>
                  logActivity({ timestamp: new Date().toISOString(), page: "Settings", action: "DELETE_ACCOUNT_CLICK" })
                }>
                  <Trash2 className="mr-2 h-4 w-4" />Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what alerts and notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { title: "Rule Changes", description: "Get notified when firewall rules are added, modified, or removed", defaultChecked: true },
                { title: "Security Alerts", description: "Alerts for blocked traffic, failed login attempts, and suspicious activity", defaultChecked: true },
                { title: "Member Activity", description: "Notifications when members join, leave, or change roles", defaultChecked: true },
                { title: "Server Status", description: "Server health, connectivity, and performance alerts", defaultChecked: false },
                { title: "Weekly Digest", description: "Weekly summary of all firewall activity and security events", defaultChecked: false },
                { title: "Protected Port Violations", description: "Alerts when attempts are made to modify immutable ports", defaultChecked: true },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked={item.defaultChecked} onCheckedChange={(v) =>
                    logActivity({ timestamp: new Date().toISOString(), page: "Settings", action: "TOGGLE_NOTIFICATION", data: { key: item.title, enabled: v } })
                  } />
                </div>
              ))}
              <Separator />
              <div className="flex justify-end">
                <Button className="bg-[#ff9900] hover:bg-[#ec7211] text-white">
                  <Save className="mr-2 h-4 w-4" />Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Servers Tab */}
        <TabsContent value="servers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Managed Servers</CardTitle>
                  <CardDescription>Servers connected to this firewall manager</CardDescription>
                </div>
                <Button size="sm" className="bg-[#ff9900] hover:bg-[#ec7211] text-white">
                  <Plus className="mr-2 h-4 w-4" />Add Server
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "vps-1", ip: "192.168.1.10", os: "Ubuntu 22.04", status: "online", firewallEngine: "nftables", groups: 2, rules: 12 },
                { name: "vps-2", ip: "192.168.1.20", os: "Debian 12", status: "online", firewallEngine: "iptables", groups: 1, rules: 8 },
                { name: "vps-3", ip: "10.0.0.5", os: "CentOS 9", status: "offline", firewallEngine: "nftables", groups: 3, rules: 15 },
              ].map((server) => (
                <div key={server.name} className="flex items-center justify-between border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center bg-muted">
                      <Server className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{server.name}</span>
                        <Badge variant="outline" className={server.status === "online" ? "border-emerald-500 text-emerald-500" : "border-red-500 text-red-500"}>
                          {server.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <code>{server.ip}</code>
                        <span>{server.os}</span>
                        <span>{server.firewallEngine}</span>
                        <span>{server.groups} groups</span>
                        <span>{server.rules} rules</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() =>
                    logActivity({ timestamp: new Date().toISOString(), page: "Settings", action: "SYNC_SERVER", data: { server: server.name } })
                  }>
                    <RefreshCw className="mr-2 h-3 w-3" />Sync
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Server Requirements</AlertTitle>
            <AlertDescription>
              Each server must have the firewall agent installed and running with{" "}
              <code className="text-xs bg-muted px-1 py-0.5">CAP_NET_ADMIN</code>{" "}
              capability for iptables/nftables management.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
