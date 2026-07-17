"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { formatTimestamp, getSpeakerColor } from "@/lib/utils"
import type { TranscriptLine } from "@/lib/types"

interface TranscriptViewProps {
  lines: TranscriptLine[]
  onSeek?: (timestamp: number) => void
}

// Keyword highlight patterns
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
            <mark key={`${i}-${matches[i]}`} className="bg-[var(--accent)]/20 text-[var(--accent2)] px-0.5 rounded">
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

// Build speaker index map for color assignment
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
    <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/40 border border-white/5 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/35 transition-all">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search keywords inside transcript..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none font-semibold"
        />
      </div>

      {/* Transcript lines */}
      <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
        {filtered.map((line, i) => {
          const color = getSpeakerColor(speakerIndex.get(line.speaker) ?? 0)
          return (
            <button
              key={i}
              onClick={() => {
                onSeek?.(line.timestamp)
                window.dispatchEvent(new CustomEvent('seek-audio', { detail: line.timestamp }))
              }}
              className="w-full text-left flex items-start gap-4 p-3 rounded-xl hover:bg-purple-600/10 border border-transparent hover:border-purple-500/10 transition-all group cursor-pointer"
            >
              {/* Speaker name */}
              <span className="text-xs font-bold min-w-[90px] truncate" style={{ color }}>
                {line.speaker}
              </span>
              {/* Timestamp */}
              <span className="text-[10px] font-bold font-mono text-zinc-500 min-w-[42px] pt-0.5">
                {formatTimestamp(line.timestamp)}
              </span>
              {/* Text */}
              <span className="text-sm text-[var(--text2)] flex-1 group-hover:text-white transition-colors leading-relaxed font-semibold">
                {highlightText(line.text)}
              </span>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-[var(--text3)] text-center py-10 font-semibold">No matching transcript logs found.</p>
        )}
      </div>
    </div>
  )
}
