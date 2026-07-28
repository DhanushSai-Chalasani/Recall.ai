"use client"

import type { RecorderSettings as Settings } from "@/lib/types"

interface RecorderSettingsProps {
  settings: Settings
  onChange: (settings: Settings) => void
}

export function RecorderSettings({ settings, onChange }: RecorderSettingsProps) {
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        AI Strategy
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* Speaker Diarize */}
        <button
          onClick={() => update('diarize', !settings.diarize)}
          className={`
            p-3 rounded-lg border text-left transition-all text-xs
            ${settings.diarize
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-background border-border text-muted-foreground"
            }
          `}
        >
          <p className="font-semibold">Speaker ID</p>
          <p className="text-[10px] mt-0.5 opacity-70">{settings.diarize ? "On" : "Off"}</p>
        </button>

        {/* Action Items */}
        <button
          onClick={() => update('actions', !settings.actions)}
          className={`
            p-3 rounded-lg border text-left transition-all text-xs
            ${settings.actions
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-background border-border text-muted-foreground"
            }
          `}
        >
          <p className="font-semibold">Action Items</p>
          <p className="text-[10px] mt-0.5 opacity-70">{settings.actions ? "On" : "Off"}</p>
        </button>

        {/* Language */}
        <div className="p-3 rounded-lg border border-border bg-background">
          <p className="font-semibold text-xs text-muted-foreground mb-1">Language</p>
          <select
            value={settings.language}
            onChange={(e) => update('language', e.target.value)}
            className="w-full bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-card text-foreground">English</option>
            <option value="hi" className="bg-card text-foreground">Hindi</option>
            <option value="es" className="bg-card text-foreground">Spanish</option>
            <option value="fr" className="bg-card text-foreground">French</option>
            <option value="auto" className="bg-card text-foreground">Auto-detect</option>
          </select>
        </div>

        {/* Summary Style */}
        <div className="p-3 rounded-lg border border-border bg-background">
          <p className="font-semibold text-xs text-muted-foreground mb-1">Style</p>
          <select
            value={settings.style}
            onChange={(e) => update('style', e.target.value)}
            className="w-full bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="detailed" className="bg-card text-foreground">Detailed</option>
            <option value="brief" className="bg-card text-foreground">Brief</option>
            <option value="bullet" className="bg-card text-foreground">Bullet</option>
          </select>
        </div>
      </div>
    </div>
  )
}
