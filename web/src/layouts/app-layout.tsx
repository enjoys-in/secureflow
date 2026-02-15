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
  Activity,
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
      { to: "/processes", label: "Processes", icon: Activity },
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

            {/* Footer */}
            <footer className="border-t border-border bg-card/50 px-6 py-4 mt-10">
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
                <span>Made With</span>
                <span className="text-red-500">❤</span>
                <span>by</span>
                <span className="font-semibold text-foreground">Enjoys</span>
                <span className="mx-1.5">·</span>
                <a
                  href="https://github.com/enjoys-in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
