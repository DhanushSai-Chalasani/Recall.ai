"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { MeetingResult, RecorderSettings, StepStatus, StepName } from "@/lib/types"
import { MOCK_MEETING } from "@/lib/mock-data"

const STEP_LABELS: Record<StepName, string> = {
  captured: 'Audio captured',
  transcribing: 'Transcribing (Groq Whisper)',
  analysing: 'Analysing (Llama 3)',
  extracting: 'Extracting action items',
  saving: 'Saving to database',
}

const STEP_NAMES: StepName[] = ['captured', 'transcribing', 'analysing', 'extracting', 'saving']

// Simulated step durations in ms (for demo mode)
const STEP_DELAYS = [600, 1200, 1000, 800, 500]

function createInitialSteps(): StepStatus[] {
  return STEP_NAMES.map(name => ({
    name,
    label: STEP_LABELS[name],
    state: 'pending' as const,
  }))
}

export function useProcessAudio() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [steps, setSteps] = useState<StepStatus[]>(createInitialSteps())
  const [result, setResult] = useState<MeetingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const advanceStep = useCallback((index: number) => {
    setSteps(prev => prev.map((step, i) => ({
      ...step,
      state: i < index ? 'done' : i === index ? 'active' : 'pending',
    })))
  }, [])

  const process = useCallback(async (
    audioBlob: Blob,
    settings: RecorderSettings,
    meetingName: string
  ) => {
    setIsProcessing(true)
    setError(null)
    setSteps(createInitialSteps())

    try {
      const formData = new FormData()
      const filename = (audioBlob as any).name || 'recording.webm'
      formData.append('audio', audioBlob, filename)
      formData.append('name', meetingName)
      formData.append('diarize', String(settings.diarize))
      formData.append('actions', String(settings.actions))
      formData.append('language', settings.language)
      formData.append('style', settings.style)

      // Step 0: captured
      advanceStep(0)
      await new Promise(r => setTimeout(r, STEP_DELAYS[0]))

      // Step 1: transcribing
      advanceStep(1)

      const res = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        
        // Handle specific case for missing API keys
        if (res.status === 402 || errorData.code === 'MISSING_API_KEYS') {
          console.warn("API Keys missing, falling back to Demo Mode")
          
          for (let i = 2; i < STEP_NAMES.length; i++) {
            advanceStep(i)
            await new Promise(r => setTimeout(r, 450))
          }
          
          const fallbackData: MeetingResult = {
            ...MOCK_MEETING,
            name: meetingName,
            suggestedTitle: meetingName
          }
          
          setSteps(prev => prev.map(s => ({ ...s, state: 'done' as const })))
          setResult(fallbackData)
          toast.info("Using Demo Mode sample data (API keys not configured)")
          return fallbackData
        }

        throw new Error(errorData.error || 'Failed to process audio')
      }

      const data: MeetingResult = await res.json()

      // Step 2: analysing
      advanceStep(2)
      await new Promise(r => setTimeout(r, STEP_DELAYS[2]))

      // Step 3: extracting
      advanceStep(3)
      await new Promise(r => setTimeout(r, STEP_DELAYS[3]))

      // Step 4: saving
      advanceStep(4)
      await new Promise(r => setTimeout(r, STEP_DELAYS[4]))

      // All done
      setSteps(prev => prev.map(s => ({ ...s, state: 'done' as const })))
      setResult(data)
      return data
    } catch (err: any) {
      console.error("Processing error:", err)
      const message = err.message || 'An unexpected error occurred'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [advanceStep])

  const reset = useCallback(() => {
    setSteps(createInitialSteps())
    setResult(null)
    setError(null)
    setIsProcessing(false)
  }, [])

  return { isProcessing, steps, result, error, process, reset }
}
