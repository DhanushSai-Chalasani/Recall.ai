"use client"

import { useState, useRef, useEffect } from "react"
import { Download, Copy, FileText, FileDown, ClipboardList, X, BookHeart } from "lucide-react"
import { toast } from "sonner"
import type { MeetingResult } from "@/lib/types"
import { formatTimestamp } from "@/lib/utils"

interface ExportDropdownProps {
  result: MeetingResult
}

export function ExportDropdown({ result }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function copySummary() {
    const text = `# ${result.name}\n\n## Summary\n${result.tldr}\n\n## Key Quote\n"${result.keyQuote || "—"}"\n\n## Action Items\n${result.actionItems.map(a => `- [${a.done ? "x" : " "}] ${a.text}${a.assignee ? ` → ${a.assignee}` : ""}`).join("\n")}`
    navigator.clipboard.writeText(text)
    toast.success("Summary copied to clipboard")
    setOpen(false)
  }

  function copyTranscript() {
    const text = result.transcript
      .map(l => `[${formatTimestamp(l.timestamp)}] ${l.speaker}: ${l.text}`)
      .join("\n")
    navigator.clipboard.writeText(text)
    toast.success("Transcript copied to clipboard")
    setOpen(false)
  }

  function copyActionItems() {
    const text = result.actionItems
      .map(a => `${a.done ? "✅" : "⬜"} [${a.priority.toUpperCase()}] ${a.text}${a.assignee ? ` → ${a.assignee}` : ""}`)
      .join("\n")
    navigator.clipboard.writeText(text)
    toast.success("Action items copied to clipboard")
    setOpen(false)
  }

  function downloadTxt() {
    const header = `${result.name}\nDate: ${new Date().toLocaleDateString()}\nDuration: ${Math.floor(result.stats.duration / 60)} minutes\nSpeakers: ${result.stats.speakerCount}\n`
    const summary = `\n─── SUMMARY ───\n${result.tldr}\n`
    const transcript = `\n─── TRANSCRIPT ───\n${result.transcript.map(l => `[${formatTimestamp(l.timestamp)}] ${l.speaker}: ${l.text}`).join("\n")}\n`
    const actions = `\n─── ACTION ITEMS ───\n${result.actionItems.map(a => `[${a.priority.toUpperCase()}] ${a.text}${a.assignee ? ` → ${a.assignee}` : ""}`).join("\n")}\n`
    const insights = `\n─── INSIGHTS ───\nSentiment: ${result.insights.sentiment}\nRisks: ${result.insights.risks.join(", ") || "None"}\nDecisions: ${result.insights.decisions.join(", ") || "None"}\n`

    const content = header + summary + transcript + actions + insights
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.name.replace(/\s+/g, "_")}_notes.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Meeting notes downloaded")
    setOpen(false)
  }

  function downloadMarkdown() {
    const md = `# ${result.name}

**Date:** ${new Date().toLocaleDateString()}  
**Duration:** ${Math.floor(result.stats.duration / 60)} minutes  
**Speakers:** ${result.stats.speakerCount}  
**Words:** ${result.stats.wordCount.toLocaleString()}  

---

## Summary

${result.tldr}

${result.keyQuote ? `> "${result.keyQuote}"` : ""}

---

## Action Items

${result.actionItems.map(a => `- [ ] **[${a.priority.toUpperCase()}]** ${a.text}${a.assignee ? ` → *${a.assignee}*` : ""}`).join("\n")}

---

## Transcript

${result.transcript.map(l => `**${l.speaker}** *(${formatTimestamp(l.timestamp)})*: ${l.text}`).join("\n\n")}

---

## Insights

- **Sentiment:** ${result.insights.sentiment}
- **Risks:** ${result.insights.risks.length > 0 ? result.insights.risks.join("; ") : "None identified"}
- **Decisions:** ${result.insights.decisions.length > 0 ? result.insights.decisions.join("; ") : "None recorded"}
`
    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.name.replace(/\s+/g, "_")}_notes.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Markdown notes downloaded")
    setOpen(false)
  }

  function exportToNotion() {
    toast.promise(
      fetch("/api/export/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: result.id }),
      }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Failed")
        return data
      }),
      {
        loading: "Syncing to Notion workspace...",
        success: "Meeting notes saved to Notion!",
        error: "Failed to sync with Notion",
      }
    )
    setOpen(false)
  }

  function exportToGoogleDocs() {
    toast.promise(
      fetch("/api/export/google-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          meetingId: result.id,
          googleToken: "mock-token-from-frontend"
        }),
      }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Failed")
        if (data.url) {
          window.open(data.url, "_blank")
        }
        return data
      }),
      {
        loading: "Syncing to Google Docs...",
        success: "Google Doc created successfully!",
        error: (err: any) => `Failed to export: ${err.message || "Unknown error"}`,
      }
    )
    setOpen(false)
  }

  const ITEMS = [
    { icon: Copy, label: "Copy Summary", action: copySummary },
    { icon: FileText, label: "Copy Transcript", action: copyTranscript },
    { icon: ClipboardList, label: "Copy Action Items", action: copyActionItems },
    { divider: true },
    { icon: FileDown, label: "Download .txt", action: downloadTxt },
    { icon: FileDown, label: "Download .md", action: downloadMarkdown },
    { divider: true },
    { icon: BookHeart, label: "Send to Notion", action: exportToNotion },
    { icon: FileText, label: "Send to Google Docs", action: exportToGoogleDocs },
  ] as const

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors border border-border bg-card cursor-pointer shadow-xs"
        aria-label="Export meeting notes"
      >
        <Download className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg bg-card border border-border shadow-lg z-50 overflow-hidden py-1">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Export Options</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          {ITEMS.map((item, i) => {
            if ('divider' in item) {
              return <div key={i} className="border-t border-border my-1" />
            }
            return (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
              >
                <item.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
