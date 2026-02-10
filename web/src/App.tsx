import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "@/layouts/app-layout"
import LoginPage from "@/pages/auth/login"
import RegisterPage from "@/pages/auth/register"
import ForgotPasswordPage from "@/pages/auth/forgot-password"
import DashboardPage from "@/pages/dashboard"
import SecurityGroupsPage from "@/pages/security-groups"
import FirewallRulesPage from "@/pages/firewall-rules"
import ImmutablePortsPage from "@/pages/immutable-ports"
import MembersPage from "@/pages/members"
import AuditLogsPage from "@/pages/audit-logs"
import LiveLogsPage from "@/pages/live-logs"
import SettingsPage from "@/pages/settings"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* App routes with sidebar layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/security-groups" element={<SecurityGroupsPage />} />
          <Route path="/firewall-rules" element={<FirewallRulesPage />} />
          <Route path="/immutable-ports" element={<ImmutablePortsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/live-logs" element={<LiveLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
