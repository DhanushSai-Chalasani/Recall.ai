"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CreditCard, LogOut, Trash2, Sparkles, User, Shield } from "lucide-react"
import { useState } from "react"
import { useSubscription } from "@/contexts/subscription-context"
import { toast } from "sonner"

interface ProfileClientProps {
  user: {
    id: string
    email: string
  }
}

export function ProfileClient({ user }: ProfileClientProps) {
  const { isPro, downgradeToFree } = useSubscription()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDowngrading, setIsDowngrading] = useState(false)
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }

    window.location.href = "/"
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete account")
      }

      setShowDeleteDialog(false)
      window.location.href = "/"
    } catch (error) {
      console.error("Delete account error:", error)
      toast.error("Failed to delete account. Please try again.")
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleDowngrade = async () => {
    setIsDowngrading(true)

    try {
      await downgradeToFree()
      setShowDowngradeDialog(false)
      toast.success("You've been downgraded to the Free plan.")
    } catch (error) {
      console.error("Downgrade error:", error)
      toast.error("Failed to downgrade. Please try again.")
    } finally {
      setIsDowngrading(false)
    }
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 p-6 rounded-xl bg-card border border-border">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-base font-semibold text-primary border border-border">
            {(user.email[0] || "U").toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">User Profile</h1>
            <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
          </div>
        </div>

        {/* Subscription Management */}
        <Card className="bg-card border-border p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Subscription Plan</h2>
          </div>

          {isPro ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-xs font-semibold text-foreground">Current Plan</p>
                  <p className="text-xs text-primary mt-0.5 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pro Plan Active
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status</p>
                  <p className="text-xs font-medium text-success">Active</p>
                </div>
              </div>

              <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs text-muted-foreground" disabled={isDowngrading}>
                    Downgrade to Free
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Downgrade to Free?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will lose access to Pro features. You can upgrade again anytime.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDowngrading}>Keep Pro</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDowngrade()
                      }}
                      disabled={isDowngrading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDowngrading ? "Downgrading..." : "Confirm Downgrade"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-xs font-semibold text-foreground">Current Plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Free Tier</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status</p>
                  <p className="text-xs font-medium text-foreground">Active</p>
                </div>
              </div>
              <div className="pt-2">
                <Button size="sm" className="text-xs" asChild>
                  <a href="/upgrade">Upgrade to Pro</a>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Security & Danger Zone */}
        <Card className="bg-card border-border p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Account Actions</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </Button>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10 gap-1.5" disabled={isDeleting}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent and will delete all your meeting recordings and data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault()
                      handleDeleteAccount()
                    }}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Delete Permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    </div>
  )
}
