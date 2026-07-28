"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Archive, Trash2, FileText as FileTextIcon, MessageSquare, CheckSquare, Lightbulb } from "lucide-react"
import { StatsRow } from "@/components/results/StatsRow"
import { SpeakerChips } from "@/components/results/SpeakerChips"
import { TLDRCard } from "@/components/results/TLDRCard"
import { TranscriptView } from "@/components/results/TranscriptView"
import { ActionItemList } from "@/components/results/ActionItemList"
import { InsightsPanel } from "@/components/results/InsightsPanel"
import { ExportDropdown } from "@/components/shared/ExportDropdown"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
    return <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">Loading meeting details...</div>
  }

  if (!meeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <h2 className="text-base font-semibold text-foreground mb-2">
          Meeting not found
        </h2>
        <p className="text-xs text-muted-foreground mb-4">This meeting doesn&apos;t exist or has been deleted.</p>
        <Link href="/meetings" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to meetings
        </Link>
      </div>
    )
  }

  const date = new Date(meeting.created_at)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to meetings
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {meeting.name}
            </h1>
            {meeting.insights?.meetingType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                {meeting.insights.meetingType}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' • '}
            {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <button
            onClick={handleToggleArchive}
            disabled={isArchiving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            title={meeting.insights?.is_archived ? "Restore Meeting" : "Archive Meeting"}
          >
            <Archive className={`w-3.5 h-3.5 ${meeting.insights?.is_archived ? "fill-primary text-primary" : ""}`} />
            <span>{meeting.insights?.is_archived ? "Restore" : "Archive"}</span>
          </button>
          
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-destructive hover:bg-destructive/10 transition-all cursor-pointer shadow-xs"
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
      <Tabs defaultValue="tldr" className="w-full mt-4">
        <TabsList className="w-full grid grid-cols-4 p-1 bg-muted border border-border rounded-lg gap-1">
          <TabsTrigger 
            value="tldr" 
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all cursor-pointer"
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TLDR</span>
          </TabsTrigger>
          <TabsTrigger 
            value="transcript" 
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </TabsTrigger>
          <TabsTrigger 
            value="actions" 
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actions</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono">
              {meeting.actionItems?.length || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="tldr">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <TLDRCard result={meeting} />
            </motion.div>
          </TabsContent>

          <TabsContent value="transcript">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <TranscriptView lines={meeting.transcript} />
            </motion.div>
          </TabsContent>

          <TabsContent value="actions">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <ActionItemList items={meeting.actionItems} />
            </motion.div>
          </TabsContent>

          <TabsContent value="insights">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <InsightsPanel insights={meeting.insights} speakers={meeting.speakers} />
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
