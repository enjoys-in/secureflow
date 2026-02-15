import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { Shield } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Full-page skeleton that mimics the app layout (sidebar + header + content)
 * while the auth state is being resolved.
 */
function AppSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar skeleton */}
      <aside className="flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <Shield className="h-5 w-5 shrink-0 text-[#ff9900] animate-pulse" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Nav placeholders */}
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}

          <Skeleton className="h-3 w-14 mt-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`t${i}`} className="flex items-center gap-2.5 px-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <header className="flex h-14 items-center justify-between border-b border-border px-6 bg-card">
          <Skeleton className="h-8 w-72" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        </header>

        {/* Content skeleton */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3.5 w-64 mt-2" />
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-5 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 border border-border rounded-lg p-5 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-[300px] w-full" />
            </div>
            <div className="border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-5 w-20" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Wraps a route element — redirects to /login if not authenticated.
 * Shows a full-page skeleton while hydrating auth state.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <AppSkeleton />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
