"use client"

import { Mic } from "lucide-react"
import { motion } from "framer-motion"

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Mic className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        No active meeting session
      </h3>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        Start recording or upload an audio file to view real-time transcripts, AI summaries, and action items.
      </p>
    </motion.div>
  )
}
