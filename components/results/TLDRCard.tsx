"use client"

import { Copy, Download } from "lucide-react"
import { toast } from "sonner"
import type { MeetingResult } from "@/lib/types"

interface TLDRCardProps {
  result: MeetingResult
}

export function TLDRCard({ result }: TLDRCardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(result.tldr)
    toast.success("Summary copied to clipboard")
  }

  const handleDownload = () => {
    try {
      const header = `${result.name}\nDate: ${new Date().toLocaleDateString()}\n\n─── MEETING SUMMARY ───\n`
      const summaryContent = result.tldr
      const keyQuoteContent = result.keyQuote ? `\n\n─── KEY QUOTE ───\n"${result.keyQuote}"\n` : ""
      
      const content = header + summaryContent + keyQuoteContent
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${result.name.replace(/\s+/g, "_")}_summary.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Summary downloaded as TXT!")
    } catch (err) {
      console.error("Failed to download summary:", err)
      toast.error("Failed to download summary")
    }
  }

  return (
    <div className="bg-card border border-border p-5 rounded-xl shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Executive Summary</h3>
        <div className="flex gap-1">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Download summary"
            title="Download TXT"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Copy summary"
            title="Copy summary"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs text-foreground leading-relaxed font-normal">
        {result.tldr}
      </p>

      {/* Key quote highlight */}
      {result.keyQuote && (
        <blockquote className="border-l-2 border-primary pl-3.5 py-2.5 bg-primary/5 rounded-r-md">
          <p className="text-[10px] uppercase font-semibold tracking-wider text-primary mb-0.5">Key Insight</p>
          <p className="text-xs italic text-foreground leading-relaxed">
            &ldquo;{result.keyQuote}&rdquo;
          </p>
        </blockquote>
      )}
    </div>
  )
}
