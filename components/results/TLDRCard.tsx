"use client"

import { Copy, Share2, Download } from "lucide-react"
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
      toast.success("Summary downloaded successfully as TXT file!")
    } catch (err) {
      console.error("Failed to download summary:", err)
      toast.error("Failed to download summary")
    }
  }

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Session Executive Summary</h3>
        <div className="flex gap-1.5">
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm"
            aria-label="Download summary as TXT"
            title="Download summary as TXT"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm"
            aria-label="Copy summary"
            title="Copy summary"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-[var(--text2)] leading-relaxed font-semibold">
        {result.tldr}
      </p>

      {/* Key quote highlight */}
      {result.keyQuote && (
        <blockquote className="border-l-2 border-pink-500 pl-4 py-3.5 bg-pink-500/5 rounded-r-xl glow-pink">
          <p className="text-xs uppercase font-extrabold tracking-widest text-pink-400 mb-1">Key Insight / Decision</p>
          <p className="text-sm italic text-zinc-200 font-semibold leading-relaxed">
            &ldquo;{result.keyQuote}&rdquo;
          </p>
        </blockquote>
      )}
    </div>
  )
}
