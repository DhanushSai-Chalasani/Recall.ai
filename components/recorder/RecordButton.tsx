"use client"

import { motion } from "framer-motion"
import type { Phase } from "@/lib/types"
import { Mic, Square, Loader2 } from "lucide-react"

interface RecordButtonProps {
  phase: Phase
  onStart: () => void
  onStop: () => void
}

export function RecordButton({ phase, onStart, onStop }: RecordButtonProps) {
  const isRecording = phase === "recording"
  const isProcessing = phase === "processing"

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring (recording only) */}
      {isRecording && (
        <motion.div
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-[-12px] rounded-full border border-destructive"
        />
      )}

      <button
        onClick={isRecording ? onStop : onStart}
        disabled={isProcessing}
        aria-label={isRecording ? "Stop recording" : isProcessing ? "Processing audio" : "Start recording"}
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200 shadow-md cursor-pointer
          ${isRecording
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : isProcessing
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
          }
        `}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <Square className="w-4 h-4 fill-current" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
