import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, ArrowLeft } from "lucide-react"
import type { ForgotPasswordPayload } from "@/types"
import { logActivity } from "@/types"

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordPayload>({ defaultValues: { email: "" } })

  const onSubmit = async (data: ForgotPasswordPayload) => {
    logActivity({ timestamp: new Date().toISOString(), page: "ForgotPassword", action: "RESET_LINK_REQUESTED", data })
    await new Promise((r) => setTimeout(r, 1200))
    logActivity({ timestamp: new Date().toISOString(), page: "ForgotPassword", action: "RESET_LINK_SENT", data: { email: data.email } })
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Shield className="h-10 w-10 text-[#ff9900]" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Firewall Manager</h1>
        </div>

        <Card className="border-t-2 border-t-[#ff9900] border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Reset password</CardTitle>
            <CardDescription>
              {sent ? "Check your email for a reset link" : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 text-center text-sm text-muted-foreground">
                  We've sent a password reset link to your email address. Please check your inbox.
                </div>
                <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                  Send again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...register("email", { required: "Email is required" })} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full bg-[#ff9900] hover:bg-[#ec7211] text-white" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-[#ff9900]">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
