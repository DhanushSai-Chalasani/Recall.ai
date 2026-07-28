"use client"

import { motion } from "framer-motion"
import { getInitials, getSpeakerColor, formatMinSec } from "@/lib/utils"
import type { Speaker } from "@/lib/types"

interface SpeakerChipsProps {
  speakers: Speaker[]
}

export function SpeakerChips({ speakers }: SpeakerChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {speakers.map((speaker, i) => {
        const color = getSpeakerColor(i)
        return (
          <motion.div
            key={speaker.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-card shadow-xs text-xs"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {getInitials(speaker.label)}
            </div>
            <span className="font-medium text-foreground">{speaker.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatMinSec(speaker.talkTime)}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
