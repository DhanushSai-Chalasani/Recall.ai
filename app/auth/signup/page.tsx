"use client"

import type React from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Mic, Mail, CheckCircle2, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const [returnUrl, setReturnUrl] = useState<string | null>(null)
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      setReturnUrl(params.get("returnUrl"))
    }
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push(returnUrl || "/dashboard")
    }
  }, [user, authLoading, returnUrl, router])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      // If we are using the placeholder local URL, skip actual fetch to avoid CORS/DNS exception
      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-url-please-replace")
      
      if (isPlaceholder) {
        console.log("[SignUp] Using offline demo mode bypass")
        document.cookie = "sb-mock-session=true; path=/; max-age=86400"
        router.push(returnUrl || "/dashboard")
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error

      // If the user is immediately logged in (email confirmation disabled),
      // redirect them directly to the dashboard.
      if (data.session) {
        router.push(returnUrl || "/dashboard")
      } else {
        // Email confirmation is required — show the success screen.
        setEmailSent(true)
      }
    } catch (err: any) {
      // Fallback for fetch/network errors (perfect for running local demo without a database)
      if (err instanceof Error && (err.message.includes("failed to fetch") || err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        console.warn("[SignUp] Supabase connection failed. Falling back to offline mock session.", err)
        document.cookie = "sb-mock-session=true; path=/; max-age=86400"
        router.push(returnUrl || "/dashboard")
        return
      }

      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-purple-500/30">
      {/* Ambient background glows */}
      <div className="absolute top-[30%] left-[20%] w-[350px] h-[350px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-pink-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-[var(--text)] font-sans">
          Recall<span className="text-purple-400">.ai</span>
        </span>
      </Link>

      <div className="w-full max-w-md relative z-10 glass-panel p-8 rounded-2xl glow-purple">
        <AnimatePresence mode="wait">
          {emailSent ? (
            /* ── Email sent success screen ───────────── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
                  <Mail className="w-9 h-9 text-[var(--green)]" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[var(--text)] mb-2">
                  Check your inbox
                </h1>
                <p className="text-sm text-[var(--text2)] leading-relaxed">
                  We&apos;ve sent a confirmation link to{" "}
                  <span className="font-semibold text-[var(--text)]">{email}</span>.
                  Click it to activate your account.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/5 border border-white/5 text-left space-y-2.5">
                {["Check your spam folder if you don't see the email.", "The link expires after 24 hours.", "Once confirmed, you'll be taken to your dashboard."].map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--text2)]">{tip}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-semibold"
              >
                Back to Sign In <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ) : (
            /* ── Signup form ─────────────────────────── */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">
                  Create Account
                </h1>
                <p className="mt-2 text-sm text-[var(--text2)]">Start capturing meetings in seconds</p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[var(--text2)] text-xs font-semibold uppercase tracking-wider">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/30 border-white/5 text-[var(--text)] placeholder:text-[var(--text3)] focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/35 h-11 rounded-xl transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[var(--text2)] text-xs font-semibold uppercase tracking-wider">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="bg-black/30 border-white/5 text-[var(--text)] placeholder:text-[var(--text3)] focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/35 h-11 rounded-xl transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="repeat-password" className="text-[var(--text2)] text-xs font-semibold uppercase tracking-wider">Confirm Password</Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="bg-black/30 border-white/5 text-[var(--text)] placeholder:text-[var(--text3)] focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/35 h-11 rounded-xl transition-all"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-[var(--red)]/10 border border-[var(--red)]/20 px-3 py-3 text-xs font-medium text-[var(--red)]"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all border border-purple-500/20"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account…" : "Create Account"}
                </Button>
              </form>

              <p className="text-center text-sm text-[var(--text3)]">
                Already have an account?{" "}
                <Link
                  href={returnUrl ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/auth/login"}
                  className="text-purple-400 hover:text-purple-300 hover:underline font-semibold"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
