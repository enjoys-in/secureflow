import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { Shield, Loader2 } from "lucide-react"

/**
 * Wraps a route element — redirects to /login if not authenticated.
 * Shows a minimal loading spinner while hydrating auth from localStorage.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Shield className="h-8 w-8 text-[#ff9900] animate-pulse" />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
