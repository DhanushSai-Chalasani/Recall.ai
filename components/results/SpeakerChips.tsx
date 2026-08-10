"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Edit2, Check, X } from "lucide-react"
import { getInitials, getSpeakerColor, formatMinSec } from "@/lib/utils"
import type { Speaker } from "@/lib/types"

interface SpeakerChipsProps {
  speakers: Speaker[]
  onRenameSpeaker?: (speakerId: string, currentLabel: string, newLabel: string) => void
}

export function SpeakerChips({ speakers, onRenameSpeaker }: SpeakerChipsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  function startEdit(speaker: Speaker) {
    setEditingId(speaker.id)
    setEditValue(speaker.label)
  }

  function saveEdit(speaker: Speaker) {
    if (editValue.trim() && editValue.trim() !== speaker.label) {
      onRenameSpeaker?.(speaker.id, speaker.label, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {speakers.map((speaker, i) => {
        const color = getSpeakerColor(i)
        const isEditing = editingId === speaker.id

        return (
          <motion.div
            key={speaker.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-card shadow-xs text-xs group"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {getInitials(isEditing ? editValue || speaker.label : speaker.label)}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(speaker)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  autoFocus
                  className="w-24 px-1.5 py-0.5 rounded bg-background border border-primary text-xs text-foreground outline-none font-medium"
                />
                <button
                  onClick={() => saveEdit(speaker)}
                  className="p-0.5 text-success hover:bg-success/10 rounded transition-colors"
                  title="Save name"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-0.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{speaker.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatMinSec(speaker.talkTime)}
                </span>
                {onRenameSpeaker && (
                  <button
                    onClick={() => startEdit(speaker)}
                    className="p-0.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-0.5"
                    title="Rename speaker"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
