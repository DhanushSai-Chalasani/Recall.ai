"use client"

import { useState } from "react"
import { Search } from "lucide-react"
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
  const speakerIndex = buildSpeakerIndex(lines)

  const filtered = search
    ? lines.filter(l => l.text.toLowerCase().includes(search.toLowerCase()))
    : lines

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
          return (
            <button
              key={i}
              onClick={() => {
                onSeek?.(line.timestamp)
                window.dispatchEvent(new CustomEvent('seek-audio', { detail: line.timestamp }))
              }}
              className="w-full text-left flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/60 transition-colors group cursor-pointer"
            >
              <span className="text-xs font-semibold min-w-[85px] truncate" style={{ color }}>
                {line.speaker}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground min-w-[40px] pt-0.5">
                {formatTimestamp(line.timestamp)}
              </span>
              <span className="text-xs text-foreground flex-1 leading-relaxed">
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
