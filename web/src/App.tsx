import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import AppLayout from "@/layouts/app-layout"
import LoginPage from "@/pages/auth/login"
import ForgotPasswordPage from "@/pages/auth/forgot-password"
import DashboardPage from "@/pages/dashboard"
import SecurityGroupsPage from "@/pages/security-groups"
import FirewallRulesPage from "@/pages/firewall-rules"
import ImmutablePortsPage from "@/pages/immutable-ports"
import MembersPage from "@/pages/members"
import AuditLogsPage from "@/pages/audit-logs"
import LiveLogsPage from "@/pages/live-logs"
import BlockedIpsPage from "@/pages/blocked-ips"
import SettingsPage from "@/pages/settings"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes — require authentication */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/security-groups" element={<SecurityGroupsPage />} />
            <Route path="/firewall-rules" element={<FirewallRulesPage />} />
            <Route path="/immutable-ports" element={<ImmutablePortsPage />} />
            <Route path="/blocked-ips" element={<BlockedIpsPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/live-logs" element={<LiveLogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
