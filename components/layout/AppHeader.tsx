"use client"

import { usePathname } from "next/navigation"
import { useMeetingContext } from "@/contexts/meeting-context"
import { ExportDropdown } from "@/components/shared/ExportDropdown"
import { useAuth } from "@/contexts/auth-context"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

/**
 * Generates breadcrumb segments from the current pathname.
 * e.g. "/meetings/abc-123" → [{ label: "Meetings", href: "/meetings" }, { label: "abc-123" }]
 */
function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const labelMap: Record<string, string> = {
    dashboard: "Dashboard",
    meetings: "Meetings",
    archive: "Archive",
    profile: "Profile",
    upgrade: "Upgrade",
  }

  return segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const isLast = index === segments.length - 1
    const label = labelMap[segment] || (segment.length > 20 ? segment.slice(0, 8) + "…" : segment)

    return { label, href, isLast }
  })
}

export function AppHeader() {
  const breadcrumbs = useBreadcrumbs()
  const { phase, result } = useMeetingContext()
  const { user } = useAuth()
  const isLive = phase === "recording"

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm min-h-[52px]">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1.5 pl-12 lg:pl-0">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            {crumb.isLast ? (
              <span className="text-sm font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-3">
        {/* Live recording indicator */}
        {isLive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/30">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-medium text-destructive">LIVE</span>
          </div>
        )}

        {/* Export button (only when a meeting result is ready) */}
        {phase === "complete" && result && (
          <ExportDropdown result={result} />
        )}

        {/* User avatar */}
        {user && (
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary border border-border hover:bg-primary/25 transition-colors"
            title="Account Profile"
          >
            {(user.email?.[0] || "U").toUpperCase()}
          </Link>
        )}
      </div>
    </header>
  )
}
