"use client"

import { useEffect, useRef } from "react"
import { useWaveform } from "@/hooks/useWaveform"

interface WaveformCanvasProps {
  isRecording: boolean
  stream?: MediaStream | null
}

export function WaveformCanvas({ isRecording, stream }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useWaveform(canvasRef, isRecording, stream)

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  return (
    <div className="w-full h-[72px] rounded-md bg-background border border-border overflow-hidden">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Audio waveform visualization"
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
