"use client"

import { useMeetingContext } from "@/contexts/meeting-context"
import { ExportDropdown } from "@/components/shared/ExportDropdown"

export function Topbar() {
  const { phase, result } = useMeetingContext()
  const isLive = phase === "recording"

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--bg2)]/50 backdrop-blur-sm">
      {/* Left: app name (with left padding on mobile to clear the hamburger button) */}
      <div className="flex items-center gap-3 pl-12 lg:pl-0">
        <h1
          className="text-lg font-bold text-[var(--text)] tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Recall<span className="text-[var(--accent2)] font-light">.ai</span>
        </h1>
      </div>

      {/* Right: badges + actions */}
      <div className="flex items-center gap-3">
        {/* Live badge */}
        {isLive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--red)]/10 border border-[var(--red)]/30">
            <span className="w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--red)]">LIVE</span>
          </div>
        )}

        {/* Model badges */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-[var(--accent)]/15 text-[var(--accent2)] border border-[var(--accent)]/30 shadow-[0_0_12px_rgba(124,110,240,0.25)] transition-all hover:scale-105">
            ✨ Whisper-v3
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30 shadow-[0_0_12px_rgba(74,222,128,0.25)] transition-all hover:scale-105">
            🤖 Llama 3
          </span>
        </div>

        {/* Export button (only in complete phase) */}
        {phase === "complete" && result && (
          <ExportDropdown result={result} />
        )}

        {/* Profile Avatar button */}
        <a
          href="/profile"
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-xs font-bold text-white border border-white/20 shadow-md hover:scale-105 transition-transform cursor-pointer ml-1"
          title="Account Profile"
        >
          R
        </a>
      </div>
    </header>
  )
}
