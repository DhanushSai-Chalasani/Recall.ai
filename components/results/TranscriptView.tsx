"use client"

import { useState, useEffect } from "react"
import { Search, Volume2 } from "lucide-react"
import { formatTimestamp, getSpeakerColor } from "@/lib/utils"
import type { TranscriptLine } from "@/lib/types"

interface TranscriptViewProps {
  lines: TranscriptLine[]
  onSeek?: (timestamp: number) => void
}

const HIGHLIGHT_PATTERNS = [/deadline/gi, /budget/gi, /decision/gi, /action/gi, /blocker/gi]

function highlightText(text: string): React.ReactNode {
  let parts: React.ReactNode[] = [text]

  HIGHLIGHT_PATTERNS.forEach((pattern) => {
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return [part]
      const split = part.split(pattern)
      const matches = part.match(pattern)
      if (!matches) return [part]

      const result: React.ReactNode[] = []
      split.forEach((segment, i) => {
        result.push(segment)
        if (matches[i]) {
          result.push(
            <mark key={`${i}-${matches[i]}`} className="bg-primary/20 text-primary px-1 py-0.5 rounded font-medium">
              {matches[i]}
            </mark>
          )
        }
      })
      return result
    })
  })

  return <>{parts}</>
}

function buildSpeakerIndex(lines: TranscriptLine[]): Map<string, number> {
  const map = new Map<string, number>()
  let idx = 0
  lines.forEach(line => {
    if (!map.has(line.speaker)) {
      map.set(line.speaker, idx++)
    }
  })
  return map
}

export function TranscriptView({ lines, onSeek }: TranscriptViewProps) {
  const [search, setSearch] = useState("")
  const [activeTime, setActiveTime] = useState<number | null>(null)
  const speakerIndex = buildSpeakerIndex(lines)

  useEffect(() => {
    const handleTimeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>
      if (typeof customEvent.detail === "number") {
        setActiveTime(customEvent.detail)
      }
    }
    window.addEventListener("audio-time-update", handleTimeUpdate)
    return () => window.removeEventListener("audio-time-update", handleTimeUpdate)
  }, [])

  const filtered = search
    ? lines.filter(l => l.text.toLowerCase().includes(search.toLowerCase()))
    : lines

  let activeIndex = -1
  if (activeTime !== null) {
    for (let idx = 0; idx < filtered.length; idx++) {
      if (filtered[idx].timestamp <= activeTime) {
        activeIndex = idx
      } else {
        break
      }
    }
  }

  return (
    <div className="bg-card border border-border p-5 rounded-xl shadow-xs space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-background border border-border focus-within:border-primary transition-all">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter transcript keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-medium"
        />
      </div>

      {/* Transcript lines */}
      <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
        {filtered.map((line, i) => {
          const color = getSpeakerColor(speakerIndex.get(line.speaker) ?? 0)
          const isActive = i === activeIndex
          return (
            <button
              key={i}
              onClick={() => {
                onSeek?.(line.timestamp)
                window.dispatchEvent(new CustomEvent('seek-audio', { detail: line.timestamp }))
              }}
              className={`w-full text-left flex items-start gap-3 p-2.5 rounded-md transition-all group cursor-pointer ${
                isActive
                  ? "bg-primary/10 border border-primary/30 shadow-xs"
                  : "hover:bg-muted/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-[85px]">
                {isActive ? (
                  <Volume2 className="w-3 h-3 text-primary animate-pulse flex-shrink-0" />
                ) : (
                  <span className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="text-xs font-semibold truncate" style={{ color }}>
                  {line.speaker}
                </span>
              </div>
              <span className={`text-[10px] font-mono min-w-[40px] pt-0.5 ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {formatTimestamp(line.timestamp)}
              </span>
              <span className={`text-xs flex-1 leading-relaxed ${isActive ? "text-foreground font-medium" : "text-foreground"}`}>
                {highlightText(line.text)}
              </span>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No matching transcript lines found.</p>
        )}
      </div>
    </div>
  )
}
