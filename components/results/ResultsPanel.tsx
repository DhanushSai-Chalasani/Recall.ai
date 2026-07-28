"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useMeetingContext } from "@/contexts/meeting-context"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProcessingState } from "@/components/shared/ProcessingState"
import { AudioPlayer } from "@/components/shared/AudioPlayer"
import { StatsRow } from "./StatsRow"
import { SpeakerChips } from "./SpeakerChips"
import { TLDRCard } from "./TLDRCard"
import { TranscriptView } from "./TranscriptView"
import { ActionItemList } from "./ActionItemList"
import { InsightsPanel } from "./InsightsPanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileText, MessageSquare, CheckSquare, Lightbulb } from "lucide-react"

export function ResultsPanel() {
  const { phase, result, processingSteps, audioUrl } = useMeetingContext()

  if (phase === "idle" || phase === "recording" || phase === "stopped") {
    return <EmptyState />
  }

  if (phase === "processing") {
    return <ProcessingState steps={processingSteps} />
  }

  if (!result) return <EmptyState />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 p-6 overflow-y-visible lg:overflow-y-auto"
    >
      {/* Session Type Banner */}
      {result.insights?.meetingType && (
        <div className="mb-4 flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detected Session Type</span>
          </div>
          <span className="px-2.5 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded border border-primary/20">
            {result.insights.meetingType}
          </span>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <div className="mb-4">
          <AudioPlayer audioUrl={audioUrl} />
        </div>
      )}

      {/* Stats */}
      <StatsRow stats={result.stats} />

      {/* Speaker Chips */}
      <SpeakerChips speakers={result.speakers} />

      {/* Tabs */}
      <Tabs defaultValue="tldr" className="w-full">
        <TabsList className="w-full grid grid-cols-4 gap-1 mb-4">
          <TabsTrigger value="tldr" className="flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TLDR</span>
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex items-center gap-1.5 text-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-1.5 text-xs">
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actions</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-mono">
              {result.actionItems.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1.5 text-xs">
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="tldr" key="tldr">
            <motion.div
              key="tldr"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <TLDRCard result={result} />
            </motion.div>
          </TabsContent>

          <TabsContent value="transcript" key="transcript">
            <motion.div
              key="transcript"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <TranscriptView lines={result.transcript} />
            </motion.div>
          </TabsContent>

          <TabsContent value="actions" key="actions">
            <motion.div
              key="actions"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <ActionItemList items={result.actionItems} />
            </motion.div>
          </TabsContent>

          <TabsContent value="insights" key="insights">
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <InsightsPanel insights={result.insights} speakers={result.speakers} />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </motion.div>
  )
}
