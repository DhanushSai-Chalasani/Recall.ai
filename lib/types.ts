// ─── Recall.ai Type Definitions ───────────────────────────────────────────────

export type Phase = 'idle' | 'recording' | 'stopped' | 'processing' | 'complete'

export type StepName = 'captured' | 'transcribing' | 'analysing' | 'extracting' | 'saving'
export type StepState = 'pending' | 'active' | 'done'

export interface StepStatus {
  name: StepName
  label: string
  state: StepState
}

export interface TranscriptLine {
  speaker: string
  timestamp: number   // seconds from start
  text: string
}

export interface ActionItem {
  id: string
  text: string
  assignee?: string
  priority: 'high' | 'medium' | 'low'
  done: boolean
}

export interface Speaker {
  id: string
  label: string         // "Speaker 1" or diarized name
  talkTime: number      // seconds
}

export interface MeetingStats {
  duration: number          // seconds
  speakerCount: number
  wordCount: number
  actionItemCount: number
}

export interface Insights {
  sentiment: 'aligned' | 'tense' | 'uncertain' | 'neutral'
  meetingType?: string
  risks: string[]
  decisions: string[]
  talkRatio: Record<string, number> // speakerId → percentage
}

export interface MeetingResult {
  id: string
  name: string
  stats: MeetingStats
  speakers: Speaker[]
  transcript: TranscriptLine[]
  tldr: string
  keyQuote?: string
  suggestedTitle?: string
  actionItems: ActionItem[]
  insights: Insights
}

export interface RecorderSettings {
  diarize: boolean
  actions: boolean
  language: string    // "en" | "hi" | "es" | "fr" | "auto"
  style: string       // "brief" | "detailed" | "bullet"
}

export type RecorderMode = 'mic' | 'upload' | 'system'
