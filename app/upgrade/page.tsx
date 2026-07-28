"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles } from "lucide-react"
import { useSubscription } from "@/contexts/subscription-context"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export default function UpgradePage() {
  const { isPro, upgradeToPro, downgradeToFree, isLoading: subLoading } = useSubscription()
  const { user } = useAuth()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUpgrade = async () => {
    if (!user) {
      router.push("/auth/signup?returnUrl=/upgrade")
      return
    }

    setIsProcessing(true)
    try {
      await upgradeToPro()
      toast.success("Welcome to Pro! You now have access to all features.")
      router.push("/upgrade/success")
    } catch (error) {
      toast.error("Failed to upgrade. Please try again.")
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDowngrade = async () => {
    setIsProcessing(true)
    try {
      await downgradeToFree()
      toast.success("You've been downgraded to the Free plan.")
    } catch (error) {
      toast.error("Failed to downgrade. Please try again.")
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isPro && !subLoading) {
    return (
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background flex flex-col items-center justify-center">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            You&apos;re a <span className="text-primary font-semibold">Pro</span> member
          </h1>
          <p className="text-xs text-muted-foreground">
            Thank you for supporting RecallAI! You have full access to all AI models and features.
          </p>

          <div className="border border-border rounded-xl p-6 bg-card text-left space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <p className="text-xs text-primary font-semibold uppercase tracking-wider">Current Plan</p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-4 h-4" /> Pro Plan
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-success/10 text-success border border-success/20">
                Active
              </span>
            </div>

            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                Unlimited meeting recordings
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                Autopilot Bot scheduling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                Semantic Vault RAG search
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button size="sm" asChild>
              <Link href="/profile">Manage Account</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDowngrade}
              disabled={isProcessing}
              className="text-xs text-muted-foreground"
            >
              {isProcessing ? "Processing..." : "Downgrade to Free"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            Upgrade to <span className="text-primary font-semibold">RecallAI Pro</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Unlock advanced meeting intelligence, autopilot bots, and full vector search.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-left">
          {/* Free Tier */}
          <div className="border border-border rounded-xl p-6 bg-card flex flex-col justify-between shadow-xs">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Free Tier</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-semibold text-foreground">$0</span>
                <span className="text-xs text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" /> 3 recordings / month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" /> Standard Whisper transcription
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" /> Basic summary export
                </li>
              </ul>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" disabled>
              Current Plan
            </Button>
          </div>

          {/* Pro Tier */}
          <div className="border-2 border-primary rounded-xl p-6 bg-card flex flex-col justify-between shadow-xs relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-primary text-primary-foreground uppercase tracking-wider">
              Recommended
            </span>
            <div>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Pro Plan</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-semibold text-foreground">$12</span>
                <span className="text-xs text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 text-xs text-foreground mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" /> Unlimited recordings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" /> Autopilot Bot for Google Meet/Zoom
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" /> Semantic Vault RAG Search
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" /> Notion & Google Docs exports
                </li>
              </ul>
            </div>
            <Button
              size="sm"
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="w-full text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isProcessing ? "Processing..." : "Upgrade to Pro"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
