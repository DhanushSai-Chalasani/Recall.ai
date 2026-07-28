"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Menu, X, Mic } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "@/contexts/subscription-context"
import { useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const { isPro } = useSubscription()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile Navigation */}
      <nav className="md:hidden border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50 w-full">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                <Mic className="w-4 h-4" />
              </div>
              <span className="font-semibold text-base tracking-tight text-foreground">
                Recall<span className="text-primary font-normal">.ai</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border px-4 py-3 space-y-3 bg-card">
            {!isLoading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block text-sm font-medium text-foreground py-1.5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="block text-sm font-medium text-foreground py-1.5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    {!isPro && (
                      <Link
                        href="/upgrade"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button className="w-full mt-2" size="sm">Upgrade to Pro</Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/upgrade"
                      className="block text-sm font-medium text-foreground py-1.5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button className="w-full mt-2" size="sm">Sign In</Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden md:block border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                <Mic className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-foreground">
                Recall<span className="text-primary font-normal">.ai</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {!isLoading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-3">
                      <Link href="/dashboard">
                        <Button size="sm" variant="ghost" className="text-xs font-medium">
                          Dashboard
                        </Button>
                      </Link>
                      <Link
                        href="/profile"
                        className={`p-1.5 rounded-md transition-colors ${
                          pathname === "/profile" ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="Profile"
                      >
                        <User className="w-4 h-4" />
                      </Link>
                      {!isPro && (
                        <Link href="/upgrade">
                          <Button variant="outline" size="sm" className="text-xs">
                            Upgrade
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <Link href="/upgrade">
                        <Button variant="ghost" size="sm" className="text-xs">
                          Pricing
                        </Button>
                      </Link>
                      <Link href="/auth/login">
                        <Button size="sm" className="text-xs">
                          Sign In
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
