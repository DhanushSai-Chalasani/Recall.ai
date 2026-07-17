"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, Users, FileText, ChevronRight, Search, Smile, Frown, HelpCircle, Sparkles, Send, Trash2, Archive, Loader2 } from "lucide-react"
import { formatMinSec } from "@/lib/utils"
import { toast } from "sonner"

const SENTIMENT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  aligned:   { icon: Smile, color: 'var(--green)' },
  tense:     { icon: Frown, color: 'var(--red)' },
  uncertain: { icon: HelpCircle, color: 'var(--amber)' },
  neutral:   { icon: Smile, color: 'var(--text3)' },
}

export default function MeetingsPage() {
  const [search, setSearch] = useState("")
  const [filterSentiment, setFilterSentiment] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [allMeetings, setAllMeetings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMeetings = () => {
    fetch("/api/meetings")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllMeetings(data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchMeetings()
    
    window.addEventListener("meetings-updated", fetchMeetings)
    return () => {
      window.removeEventListener("meetings-updated", fetchMeetings)
    }
  }, [])

  async function handleDelete(meetingId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this meeting?")) return

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setAllMeetings(prev => prev.filter(m => m.id !== meetingId))
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        toast.success("Meeting deleted")
      } else {
        toast.error("Failed to delete meeting.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while deleting the meeting.")
    }
  }

  async function handleQuickArchive(meetingId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: {
            is_archived: true
          }
        })
      })
      if (res.ok) {
        setAllMeetings(prev => prev.filter(m => m.id !== meetingId))
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        toast.success("Meeting archived", {
          description: "Found under the Archive tab."
        })
      } else {
        toast.error("Failed to archive meeting.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred.")
    }
  }

  async function handleVaultAsk() {
    if (!search.trim()) return
    setIsAsking(true)
    setAiResponse(null)
    
    try {
      const res = await fetch("/api/vault-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search }),
      })
      const data = await res.json()
      setAiResponse(data.answer || "No answer found.")
    } catch (e) {
      setAiResponse("An error occurred while searching your vault.")
    }
    
    setIsAsking(false)
  }

  const meetings = allMeetings
    .filter(m => {
      if (m.insights?.is_archived) return false
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterSentiment && m.insights?.sentiment && m.insights.sentiment !== filterSentiment) return false
      return true
    })

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto bg-gradient-to-b from-[#05050c] to-[#0a0a16] selection:bg-purple-500/30">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Meeting Vault
          </h1>
          <p className="text-xs text-[var(--text2)] font-semibold">
            {meetings.length} recordings cached inside Vector RAG database
          </p>
        </div>
      </div>

      {/* Search + Vault Ask bar */}
      <div className="flex flex-col gap-4 mb-8 p-6 rounded-2xl glass-panel relative overflow-hidden shadow-xl glow-purple">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">Vault AI Semantic Search</h2>
          </div>

          {/* Sentiment filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/30 border border-white/5">
            <button
              onClick={() => setFilterSentiment(null)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                !filterSentiment ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All
            </button>
            {["aligned", "tense", "uncertain"].map(s => (
              <button
                key={s}
                onClick={() => setFilterSentiment(filterSentiment === s ? null : s)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all capitalize cursor-pointer ${
                  filterSentiment === s ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-black/40 border border-white/5 focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all">
            <Search className="w-4.5 h-4.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Query transcripts using Vector RAG, or ask: 'What did we decide about budget?'..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (aiResponse) setAiResponse(null) // clear response if typing
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.endsWith('?')) handleVaultAsk()
              }}
              className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none font-semibold"
            />
            {search.endsWith('?') && (
              <button 
                onClick={handleVaultAsk}
                className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-all shadow-md"
                title="Ask Vault AI"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* AI Response Area */}
        <AnimatePresence>
          {(isAsking || aiResponse) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 shadow-inner"
            >
              {isAsking ? (
                <div className="flex items-center gap-2.5 text-xs font-bold text-purple-400 uppercase tracking-widest">
                  <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  Searching your meeting vault...
                </div>
              ) : (
                <p className="text-sm text-[var(--text2)] leading-relaxed">
                  <span className="font-extrabold text-purple-400">Vault AI: </span>
                  {aiResponse}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Meeting list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-20 text-sm text-[var(--text3)] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" /> Loading your meetings...
          </div>
        ) : meetings.map((meeting, i) => {
          const sentiment = SENTIMENT_ICONS[meeting.insights?.sentiment] || SENTIMENT_ICONS.neutral
          const date = new Date(meeting.created_at)

          return (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative group"
            >
              <Link
                href={`/meetings/${meeting.id}`}
                className="block p-6 rounded-2xl glass-panel glass-panel-hover pr-28 group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <h3 className="text-base font-extrabold text-white truncate group-hover:text-purple-400 transition-colors">
                        {meeting.name}
                      </h3>
                      <sentiment.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ color: sentiment.color }} />
                      {meeting.insights?.meetingType && (
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 border border-white/10 shadow-sm shadow-purple-500/10">
                          ✨ {meeting.insights.meetingType}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--text2)] line-clamp-2 mb-4 leading-relaxed font-semibold">
                      {meeting.tldr}
                    </p>

                    {/* Stats */}
                    {meeting.stats && (
                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        {formatMinSec(meeting.stats.duration ?? 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-pink-400" />
                        {meeting.stats.speakerCount ?? 1} speakers
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        {(meeting.stats.wordCount ?? 0).toLocaleString()} words
                      </span>
                    </div>
                    )}
                  </div>

                  {/* Right: date + arrow */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className="text-[10px] text-zinc-500 font-bold font-mono">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                </div>

                {/* Action items preview */}
                {meeting.actionItems && meeting.actionItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {meeting.actionItems.slice(0, 3).map((item: any) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-[9px] text-[var(--text2)] font-bold"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.done ? 'bg-[var(--green)] glow-green' : 'bg-[var(--amber)] glow-amber'}`} />
                          <span className="truncate max-w-[130px]">{item.text}</span>
                        </span>
                      ))}
                      {meeting.actionItems.length > 3 && (
                        <span className="text-[10px] text-[var(--text3)] font-bold">
                          +{meeting.actionItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>

              {/* Floating action buttons */}
              <div className="absolute right-6 top-6 flex flex-col gap-2">
                <button
                  onClick={(e) => handleQuickArchive(meeting.id, e)}
                  className="p-2 rounded-xl border border-white/5 bg-black/40 text-zinc-500 hover:text-purple-400 hover:border-purple-500/20 hover:bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer shadow-md"
                  title="Archive meeting"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(meeting.id, e)}
                  className="p-2 rounded-xl border border-white/5 bg-black/40 text-zinc-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer shadow-md"
                  title="Delete meeting"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}

        {!isLoading && meetings.length === 0 && (
          <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl bg-black/20">
            <p className="text-sm text-[var(--text3)] font-semibold">No recordings found inside this vault directory.</p>
          </div>
        )}
      </div>
    </div>
  )
}
