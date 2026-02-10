import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import {
  Shield,
  LayoutDashboard,
  Network,
  Lock,
  Users,
  ScrollText,
  Radio,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Menu,
  ShieldCheck,
  ShieldBan,
  Bell,
  Search,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { logActivity } from "@/types"
import { useAuth } from "@/contexts/auth-context"

interface NavSection {
  title: string
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[]
}

const navSections: NavSection[] = [
  {
    title: "Infrastructure",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/security-groups", label: "Security Groups", icon: ShieldCheck },
      { to: "/firewall-rules", label: "Firewall Rules", icon: Network },
      { to: "/immutable-ports", label: "Protected Ports", icon: Lock },
      { to: "/blocked-ips", label: "Blocked IPs", icon: ShieldBan },
    ],
  },
  {
    title: "Team",
    items: [
      { to: "/members", label: "Team Members", icon: Users },
      { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      { to: "/live-logs", label: "Real-Time Logs", icon: Radio },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Infrastructure: true,
    Team: true,
    System: true,
  })
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleNavClick = (label: string) => {
    logActivity({ timestamp: new Date().toISOString(), page: "Navigation", action: "NAV_CLICK", data: { target: label } })
  }

  const handleLogout = () => {
    logActivity({ timestamp: new Date().toISOString(), page: "AppLayout", action: "SIGN_OUT" })
    logout()
    navigate("/login")
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar — deep dark with Hostinger purple tint */}
        <aside
          className={cn(
            "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border",
            collapsed ? "w-16" : "w-60"
          )}
        >
          {/* Logo */}
          <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
            <Shield className="h-5 w-5 shrink-0 text-[#ff9900]" />
            {!collapsed && (
              <span className="text-[13px] font-semibold tracking-tight truncate text-white">
                Firewall Manager
              </span>
            )}
          </div>

          {/* Nav sections */}
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            {navSections.map((section) => (
              <div key={section.title} className="mb-1">
                {/* Section header */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
                  >
                    <span>{section.title}</span>
                    {expandedSections[section.title] ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                ) : (
                  <div className="h-px bg-sidebar-border my-2" />
                )}

                {/* Section items */}
                {(collapsed || expandedSections[section.title]) && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.to
                      return collapsed ? (
                        <Tooltip key={item.to}>
                          <TooltipTrigger asChild>
                            <NavLink
                              to={item.to}
                              onClick={() => handleNavClick(item.label)}
                              className={cn(
                                "flex items-center justify-center h-9 w-full text-sm transition-colors",
                                isActive
                                  ? "bg-sidebar-accent text-[#ff9900]"
                                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <Icon className="h-[18px] w-[18px]" />
                            </NavLink>
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => handleNavClick(item.label)}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 h-9 text-[13px] font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-[#ff9900] border-l-2 border-[#ff9900]"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-transparent"
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Collapse toggle */}
          <div className="border-t border-sidebar-border p-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-8 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header — dark, with search and notifications */}
          <header className="flex h-14 items-center justify-between border-b border-border px-6 bg-card">
            {/* Search */}
            <div className="flex items-center gap-2 bg-muted px-3 h-8 w-72 text-muted-foreground">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[12px]">Search...</span>
              <span className="ml-auto text-[10px] border border-border px-1.5 py-0.5 font-mono">Ctrl+K</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-[#ff9900] text-[10px] font-bold text-white flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 h-8">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-[#ff9900] text-white font-semibold">
                        {user?.name
                          ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] font-medium text-foreground hidden sm:block">
                      {user?.name || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">
                    {user?.email || "My Account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="text-[13px]">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-[13px]">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto bg-background">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
