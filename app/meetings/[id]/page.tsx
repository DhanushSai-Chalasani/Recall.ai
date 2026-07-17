"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Clock, Users, FileText, CheckSquare, Archive, Trash2 } from "lucide-react"
import { formatMinSec } from "@/lib/utils"
import { StatsRow } from "@/components/results/StatsRow"
import { SpeakerChips } from "@/components/results/SpeakerChips"
import { TLDRCard } from "@/components/results/TLDRCard"
import { TranscriptView } from "@/components/results/TranscriptView"
import { ActionItemList } from "@/components/results/ActionItemList"
import { InsightsPanel } from "@/components/results/InsightsPanel"
import { ExportDropdown } from "@/components/shared/ExportDropdown"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileText as FileTextIcon, MessageSquare, Lightbulb } from "lucide-react"
import { toast } from "sonner"

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [meeting, setMeeting] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleToggleArchive = async () => {
    setIsArchiving(true)
    const newArchivedState = !meeting.insights?.is_archived
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: {
            is_archived: newArchivedState
          }
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setMeeting(updated)
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        toast.success(newArchivedState ? "Meeting archived" : "Meeting restored", {
          description: newArchivedState ? "Found under the Archive tab." : "Found under the Meetings tab."
        })
      } else {
        toast.error("Failed to update status")
      }
    } catch (e) {
      toast.error("An error occurred")
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this meeting?")) return
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        toast.success("Meeting deleted")
        router.push("/meetings")
      } else {
        toast.error("Failed to delete meeting")
      }
    } catch (e) {
      toast.error("An error occurred")
    }
  }

  useEffect(() => {
    if (id) {
      fetch(`/api/meetings/${id}`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) setMeeting(data)
          setIsLoading(false)
        })
        .catch(() => setIsLoading(false))
    }
  }, [id])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center p-12 text-[var(--text3)]">Loading meeting details...</div>
  }

  if (!meeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
          Meeting not found
        </h2>
        <p className="text-sm text-[var(--text3)] mb-4">This meeting doesn&apos;t exist or has been deleted.</p>
        <Link href="/meetings" className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to meetings
        </Link>
      </div>
    )
  }

  const date = new Date(meeting.created_at)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 p-6 lg:p-10 overflow-y-auto bg-gradient-to-b from-[#05050c] to-[#0a0a16] selection:bg-purple-500/30"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-purple-400 font-bold uppercase tracking-wider mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to meetings
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {meeting.name}
            </h1>
            {meeting.insights?.meetingType && (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 border border-white/10 shadow-sm">
                ✨ {meeting.insights.meetingType}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text2)] mt-2 font-semibold">
            {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' • '}
            {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={handleToggleArchive}
            disabled={isArchiving}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/5 bg-black/45 text-xs font-bold text-[var(--text2)] hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
            title={meeting.insights?.is_archived ? "Restore Meeting" : "Archive Meeting"}
          >
            <Archive className={`w-3.5 h-3.5 ${meeting.insights?.is_archived ? "fill-purple-400 text-purple-400" : ""}`} />
            <span>{meeting.insights?.is_archived ? "Restore" : "Archive"}</span>
          </button>
          
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/5 bg-black/45 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer shadow-md"
            title="Delete Meeting"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <ExportDropdown result={meeting} />
        </div>
      </div>

      {/* Stats */}
      <StatsRow stats={meeting.stats} />

      {/* Speaker Chips */}
      <SpeakerChips speakers={meeting.speakers} />

      {/* Tabs */}
      <Tabs defaultValue="tldr" className="w-full mt-6">
        <TabsList className="w-full grid grid-cols-4 p-1.5 bg-black/40 border border-white/5 rounded-2xl gap-1">
          <TabsTrigger 
            value="tldr" 
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TLDR</span>
          </TabsTrigger>
          <TabsTrigger 
            value="transcript" 
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </TabsTrigger>
          <TabsTrigger 
            value="actions" 
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actions</span>
            <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">
              {meeting.actionItems.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="tldr">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <TLDRCard result={meeting} />
            </motion.div>
          </TabsContent>

          <TabsContent value="transcript">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <TranscriptView lines={meeting.transcript} />
            </motion.div>
          </TabsContent>

          <TabsContent value="actions">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ActionItemList items={meeting.actionItems} />
            </motion.div>
          </TabsContent>

          <TabsContent value="insights">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <InsightsPanel insights={meeting.insights} speakers={meeting.speakers} />
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
