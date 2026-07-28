"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Clock, Users, FileText, ChevronRight, Search, RotateCcw, Trash2, Archive, ArrowLeft } from "lucide-react"
import { formatMinSec } from "@/lib/utils"
import { toast } from "sonner"

export default function ArchivePage() {
  const [search, setSearch] = useState("")
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

  async function handleRestore(meetingId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: {
            is_archived: false
          }
        })
      })
      if (res.ok) {
        setAllMeetings(prev => prev.filter(m => m.id !== meetingId))
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        toast.success("Meeting restored", {
          description: "Available in your main Meetings list."
        })
      } else {
        toast.error("Failed to restore meeting.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred.")
    }
  }

  async function handleDelete(meetingId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Are you sure you want to permanently delete this meeting? This action cannot be undone.")) return

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setAllMeetings(prev => prev.filter(m => m.id !== meetingId))
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        toast.success("Meeting permanently deleted")
      } else {
        toast.error("Failed to delete meeting.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while deleting the meeting.")
    }
  }

  const meetings = allMeetings.filter(m => {
    if (!m.insights?.is_archived) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Archive className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Archive Vault
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          {meetings.length} archived meeting records
        </p>
      </div>

      {/* Search bar */}
      <div className="flex flex-col gap-3 mb-6 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border focus-within:border-primary transition-all">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search archived meetings by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-medium"
          />
        </div>
      </div>

      {/* Meeting list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">Loading archived meetings...</div>
        ) : meetings.map((meeting, i) => {
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
                className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all pr-24 group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-xs font-semibold text-muted-foreground line-through truncate group-hover:text-foreground transition-colors">
                        {meeting.name}
                      </h3>
                      {meeting.insights?.meetingType && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                          {meeting.insights.meetingType}
                        </span>
                      )}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground uppercase font-mono">
                        Archived
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {meeting.tldr}
                    </p>

                    {/* Stats */}
                    {meeting.stats && (
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatMinSec(meeting.stats.duration ?? 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {meeting.stats.speakerCount ?? 1} speakers
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {(meeting.stats.wordCount ?? 0).toLocaleString()} words
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: date + arrow */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </Link>
              <div className="absolute right-4 top-4 flex items-center gap-1">
                <button
                  onClick={(e) => handleRestore(meeting.id, e)}
                  className="p-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer shadow-xs"
                  title="Restore meeting"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(meeting.id, e)}
                  className="p-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer shadow-xs"
                  title="Delete permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )
        })}

        {!isLoading && meetings.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card">
            <Archive className="w-7 h-7 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-xs text-muted-foreground">No meetings in your archive vault.</p>
          </div>
        )}
      </div>
    </div>
  )
}
