import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import api from "@/lib/api"
import { logActivity } from "@/types"

// ---- Types ----

export interface AuthUser {
  id: string
  email: string
  name: string
  created_at: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchCurrentUser: () => Promise<void>
}

// ---- Context ----

const AuthContext = createContext<AuthContextValue | null>(null)
// ---- Provider ----

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ---- Fetch current user (validate cookie) ----
  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data } = await api.get("/users/me")
      setUser(data.user ?? data)
    } catch {
      setUser(null)
    }
  }, [])

  // Hydrate auth state on mount by calling the API (cookie is sent automatically)
  useEffect(() => {
    fetchCurrentUser().finally(() => setIsLoading(false))
  }, [fetchCurrentUser])

  // ---- Login ----
  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password })

    const authUser: AuthUser = data.user
    setUser(authUser)

    logActivity({
      timestamp: new Date().toISOString(),
      page: "Auth",
      action: "LOGIN_SUCCESS",
      data: { userId: authUser.id, email: authUser.email },
    })
  }, [])

  // ---- Logout ----
  const logout = useCallback(() => {
    setUser(null)

    logActivity({
      timestamp: new Date().toISOString(),
      page: "Auth",
      action: "LOGOUT",
    })
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    fetchCurrentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---- Hook ----

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>")
  }
  return ctx
}
