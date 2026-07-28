"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, Users, FileText, ChevronRight, Search, Smile, Frown, HelpCircle, Sparkles, Send, Trash2, Archive, Loader2 } from "lucide-react"
import { formatMinSec } from "@/lib/utils"
import { toast } from "sonner"

const SENTIMENT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  aligned:   { icon: Smile, color: 'var(--success)' },
  tense:     { icon: Frown, color: 'var(--destructive)' },
  uncertain: { icon: HelpCircle, color: 'var(--warning)' },
  neutral:   { icon: Smile, color: 'var(--muted-foreground)' },
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
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
            Meeting Vault
          </h1>
          <p className="text-xs text-muted-foreground">
            {meetings.length} recordings stored in semantic index
          </p>
        </div>
      </div>

      {/* Search + Vault Ask bar */}
      <div className="flex flex-col gap-3 mb-6 p-5 rounded-xl bg-card border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Semantic Vault Search</h2>
          </div>

          {/* Sentiment filter pills */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-muted border border-border">
            <button
              onClick={() => setFilterSentiment(null)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                !filterSentiment ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {["aligned", "tense", "uncertain"].map(s => (
              <button
                key={s}
                onClick={() => setFilterSentiment(filterSentiment === s ? null : s)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all capitalize cursor-pointer ${
                  filterSentiment === s ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-md bg-background border border-border focus-within:border-primary transition-all">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by title, topic, or ask: 'What did we decide about budget?'..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (aiResponse) setAiResponse(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.endsWith('?')) handleVaultAsk()
              }}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-medium"
            />
            {search.endsWith('?') && (
              <button 
                onClick={handleVaultAsk}
                className="flex items-center justify-center p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
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
              className="p-3.5 rounded-md bg-primary/5 border border-primary/20"
            >
              {isAsking ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching meeting vault...
                </div>
              ) : (
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-semibold text-primary">Vault AI: </span>
                  {aiResponse}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Meeting list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" /> Loading meetings...
          </div>
        ) : meetings.map((meeting, i) => {
          const sentiment = SENTIMENT_ICONS[meeting.insights?.sentiment] || SENTIMENT_ICONS.neutral
          const date = new Date(meeting.created_at)

          return (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative group"
            >
              <Link
                href={`/meetings/${meeting.id}`}
                className="block p-5 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-xs transition-all pr-24 group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {meeting.name}
                      </h3>
                      <sentiment.icon className="w-4 h-4 flex-shrink-0" style={{ color: sentiment.color }} />
                      {meeting.insights?.meetingType && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                          {meeting.insights.meetingType}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {meeting.tldr}
                    </p>

                    {/* Stats */}
                    {meeting.stats && (
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatMinSec(meeting.stats.duration ?? 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {meeting.stats.speakerCount ?? 1} speakers
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {(meeting.stats.wordCount ?? 0).toLocaleString()} words
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: date + arrow */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>

                {/* Action items preview */}
                {meeting.actionItems && meeting.actionItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {meeting.actionItems.slice(0, 3).map((item: any) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-[10px] text-foreground font-medium border border-border"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.done ? 'bg-success' : 'bg-warning'}`} />
                          <span className="truncate max-w-[140px]">{item.text}</span>
                        </span>
                      ))}
                      {meeting.actionItems.length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          +{meeting.actionItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>

              {/* Action buttons on hover */}
              <div className="absolute right-4 top-4 flex flex-col gap-1.5">
                <button
                  onClick={(e) => handleQuickArchive(meeting.id, e)}
                  className="p-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer shadow-xs"
                  title="Archive meeting"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(meeting.id, e)}
                  className="p-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer shadow-xs"
                  title="Delete meeting"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )
        })}

        {!isLoading && meetings.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card">
            <p className="text-xs text-muted-foreground font-medium">No meetings found in your vault.</p>
          </div>
        )}
      </div>
    </div>
  )
}
