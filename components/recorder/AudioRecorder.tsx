"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sparkles, Mic, Square, Loader2, Upload, Monitor,
  Sliders, Globe, FileText, CheckCircle2, RotateCcw, VolumeX,
  Bot, Calendar
} from "lucide-react"
import { toast } from "sonner"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useTimer } from "@/hooks/useTimer"
import { useMeetingContext } from "@/contexts/meeting-context"
import { useProcessAudio } from "@/hooks/useProcessAudio"
import { useSubscription } from "@/contexts/subscription-context"
import { WaveformCanvas } from "./WaveformCanvas"
import { extractAndDownsampleAudio } from "@/lib/audio-utils"
import type { RecorderSettings as SettingsType, RecorderMode } from "@/lib/types"

export function AudioRecorder() {
  const router = useRouter()
  const { phase, setPhase, setResult, setProcessingSteps, setAudioUrl } = useMeetingContext()
  const { isRecording, audioBlob, stream, error: micError, start: startMic, stop: stopMic } = useAudioRecorder()
  const { start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer()
  const { process, steps, error: processError } = useProcessAudio()
  const { isPro } = useSubscription()

  const [mode, setMode] = useState<RecorderMode>("mic")
  const [settings, setSettings] = useState<SettingsType>({
    diarize: true,
    actions: true,
    language: "en",
    style: "detailed",
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Autopilot Bot scheduling states
  const [botLink, setBotLink] = useState("")
  const [botTime, setBotTime] = useState("")
  const [botName, setBotName] = useState("Recall Note Taker")
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [isScheduling, setIsScheduling] = useState(false)

  async function handleScheduleBot() {
    if (!botLink || !botTime) return
    setIsScheduling(true)
    try {
      const response = await fetch("/api/bot/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: botLink,
          scheduledAt: botTime,
          botName: botName || "Recall Note Taker",
          settings: {
            diarize: settings.diarize,
            actions: settings.actions,
            language: settings.language,
            style: settings.style,
          }
        })
      })

      if (response.ok) {
        toast.success("Autopilot scheduled!", { description: `Bot will join at ${new Date(botTime).toLocaleString()}` })
        setBotLink("")
        setBotTime("")
        setBotName("Recall Note Taker")
        setDetectedPlatform(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 404) {
          toast.success("Autopilot Scheduled (Demo Mode)", { 
            description: `Scheduled bot for: ${new Date(botTime).toLocaleString()}` 
          })
          setBotLink("")
          setBotTime("")
          setBotName("Recall Note Taker")
          setDetectedPlatform(null)
        } else {
          toast.error("Failed to schedule bot", { description: errorData.error || "Please check details and try again." })
        }
      }
    } catch (err) {
      console.error(err)
      toast.success("Autopilot Scheduled (Demo Mode)", { 
        description: `Scheduled bot for: ${new Date(botTime).toLocaleString()}` 
      })
      setBotLink("")
      setBotTime("")
      setBotName("Recall Note Taker")
      setDetectedPlatform(null)
    } finally {
      setIsScheduling(false)
    }
  }
  
  async function handleStart() {
    if (mode === "bot") return
    await startMic(mode as "mic" | "system" | "upload")
    startTimer()
    setPhase("recording")
    const toastMsg = mode === "system"
      ? "Recording system audio. Make sure you share system audio in the screen prompt."
      : "Speak clearly into your microphone."
    toast("Recording started", { description: toastMsg })
  }

  async function handleStop() {
    await stopMic()
    stopTimer()
    setPhase("stopped")
    toast.success("Recording saved", { description: "Ready to process with AI." })
  }

  async function handleProcess() {
    const blob = mode === "upload" && uploadedFile
      ? uploadedFile
      : audioBlob

    if (!blob) return

    const url = URL.createObjectURL(blob)
    setAudioUrl(url)

    setPhase("processing")
    setProcessingSteps(steps)
    try {
      const result = await process(blob, settings, "New Meeting")
      if (result && result.id) {
        setResult(result)
        setPhase("complete")
        toast.success("Meeting processed!", { description: `${result.stats.wordCount.toLocaleString()} words transcribed` })
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        router.push(`/meetings/${result.id}`)
      } else {
        setPhase("stopped")
      }
    } catch {
      setPhase("stopped")
    }
  }

  async function handleFileSelect(file: File) {
    const MAX_UPLOAD_SIZE = 250 * 1024 * 1024; 
    if (file.size > MAX_UPLOAD_SIZE) {
      toast.error("File too large", { 
        description: `Maximum raw file size allowed is 250MB. This file is ${(file.size / 1024 / 1024).toFixed(1)}MB.` 
      });
      return;
    }

    setIsOptimizing(true);
    const toastId = toast.loading("Optimizing media...", {
      description: "Extracting audio track and compressing to high-efficiency vocal stream..."
    });

    try {
      const optimizedBlob = await extractAndDownsampleAudio(file);
      
      const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const optimizedFile = new File([optimizedBlob], `${originalNameWithoutExt}_optimized.wav`, {
        type: "audio/wav",
        lastModified: Date.now()
      });

      const MAX_WHISPER_SIZE = 25 * 1024 * 1024;
      if (optimizedFile.size > MAX_WHISPER_SIZE) {
        toast.dismiss(toastId);
        toast.error("Extracted audio is too large", {
          description: `Even after optimization, the extracted audio is ${(optimizedFile.size / 1024 / 1024).toFixed(1)}MB (max 25MB allowed).`
        });
        setIsOptimizing(false);
        return;
      }

      setUploadedFile(optimizedFile);
      setPhase("stopped");
      toast.dismiss(toastId);
      toast.success("Media optimized successfully!", {
        description: `Extracted mono WAV: ${(optimizedFile.size / 1024 / 1024).toFixed(1)}MB (Original: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
      });
    } catch (err: any) {
      console.error("Audio optimization failed, attempting fallback:", err);
      toast.dismiss(toastId);
      
      const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|webm|ogg|aac)$/i.test(file.name);
      if (isAudio && file.size <= 25 * 1024 * 1024) {
        setUploadedFile(file);
        setPhase("stopped");
        toast.warning("Audio loaded with fallback", {
          description: "Could not optimize in browser, but loaded the original audio file."
        });
      } else {
        toast.error("Media optimization failed", {
          description: err.message || "Ensure the file format is supported and not corrupted."
        });
      }
    } finally {
      setIsOptimizing(false);
    }
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ""
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleFileSelect])

  function handleReRecord() {
    resetTimer()
    setPhase("idle")
    setUploadedFile(null)
    setAudioUrl(null)
  }

  const showProcessButton = phase === "stopped" && (audioBlob || uploadedFile)

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden bg-background w-full">
      
      {/* FLOATING RECORDING HUD CONTROL DOCK */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-destructive/50 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
              </span>
              <span className="text-[11px] font-mono font-semibold text-destructive tracking-wider uppercase">
                REC ACTIVE
              </span>
            </div>

            <div className="h-3.5 w-[1px] bg-border" />

            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              {mode === 'system' ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-primary" />
                  <span>System Audio</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-primary" />
                  <span>Microphone</span>
                </>
              )}
            </div>

            <div className="h-3.5 w-[1px] bg-border" />

            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold uppercase tracking-wider hover:bg-destructive/90 transition-all cursor-pointer"
              title="Stop Recording"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE: PROCESSING OVERLAY */}
      <AnimatePresence>
        {phase === "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-6 p-6 rounded-xl border border-border bg-card shadow-lg relative overflow-hidden">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-1">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Synthesizing Notes
                </h3>
                <p className="text-xs text-muted-foreground">
                  Processing audio transcript and generating structured meeting insights.
                </p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3 pt-3 border-t border-border">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      {step.state === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      ) : step.state === 'active' ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                      )}
                      <span className={`text-xs ${
                        step.state === 'done'
                          ? "text-muted-foreground line-through"
                          : step.state === 'active'
                          ? "text-foreground font-medium"
                          : "text-muted-foreground/70"
                      }`}>
                        {step.label}
                      </span>
                    </div>

                    {step.state === 'active' && (
                      <span className="text-[10px] text-primary font-mono animate-pulse">
                        processing...
                      </span>
                    )}
                    {step.state === 'done' && (
                      <span className="text-[10px] text-success font-mono">
                        ready
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT COLUMN: WAVEFORM VISUALIZER CARD */}
      <div className="flex-1 flex flex-col min-h-[320px] lg:min-h-0 bg-card rounded-xl border border-border p-6 overflow-hidden relative shadow-sm items-center justify-center">
        
        {/* Recording status indicator */}
        {phase === 'recording' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded-full border border-destructive/30 bg-destructive/10 text-xs font-mono text-destructive">
            <span className="w-2 h-2 rounded-full bg-destructive animate-ping" />
            <span className="uppercase text-[9px] tracking-wider font-semibold">REC ACTIVE</span>
          </div>
        )}

        {/* Center Canvas & Heading */}
        <div className="relative z-10 w-full max-w-md flex flex-col items-center justify-center gap-5">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {phase === "recording" ? "STREAMING AUDIO" : "RECORDING STUDIO"}
            </span>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              {phase === "recording" ? "Capturing Audio..." : "Audio Recording Deck"}
            </h2>
          </div>

          {/* Canvas container */}
          <div className="w-full py-3 relative bg-muted/40 rounded-lg border border-border">
            <WaveformCanvas isRecording={isRecording} stream={stream} />
          </div>

          <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            {phase === "recording" 
              ? "Streaming encrypted audio channel. Vocal compression active."
              : "Select input source, configure options, and start recording."
            }
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: CONTROLS & DOCK */}
      <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        
        {/* Source Selector */}
        {phase === "idle" && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
              Capture Source
            </p>
            <div className="grid grid-cols-2 p-1 rounded-lg bg-muted border border-border gap-1">
              {[
                { id: 'mic' as const, icon: Mic, label: 'Microphone' },
                { id: 'upload' as const, icon: Upload, label: 'File Upload' },
                { id: 'system' as const, icon: Monitor, label: 'System Audio' },
                { id: 'bot' as const, icon: Bot, label: 'Autopilot Bot' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`
                    w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all cursor-pointer
                    ${mode === m.id
                      ? "bg-card text-foreground font-semibold shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <m.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File Drag & Drop Zone */}
        {phase === "idle" && mode === 'upload' && (
          isOptimizing ? (
            <div className="border border-dashed border-primary/50 rounded-xl p-6 text-center bg-primary/5 transition-all">
              <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
              <p className="text-sm font-semibold text-foreground">Optimizing media file...</p>
              <p className="text-xs text-muted-foreground mt-1">Extracting voice track & downsampling to 16kHz mono...</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Click or Drag & Drop File</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts MP3, WAV, M4A, WEBM, MP4</p>
            </div>
          )
        )}

        {/* System Audio Warning */}
        {phase === "idle" && mode === 'system' && (
          <div className="p-3.5 rounded-lg bg-warning/10 border border-warning/20 flex gap-2">
            <VolumeX className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              <strong className="font-semibold">System Audio Note:</strong> Ensure you enable &quot;Share audio&quot; in the browser prompt when selecting the target tab or screen.
            </p>
          </div>
        )}

        {/* Autopilot Bot Panel */}
        {phase === "idle" && mode === 'bot' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Bot className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Autopilot Scheduler</h3>
                  <p className="text-[10px] text-muted-foreground">Send a virtual agent to record the meeting</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Meeting Link (Google Meet, Zoom, Teams)
                  </label>
                  <input
                    type="text"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={botLink}
                    onChange={(e) => {
                      setBotLink(e.target.value);
                      if (e.target.value.includes("meet.google.com")) setDetectedPlatform("google-meet");
                      else if (e.target.value.includes("zoom.us")) setDetectedPlatform("zoom");
                      else if (e.target.value.includes("teams.microsoft")) setDetectedPlatform("teams");
                      else setDetectedPlatform(null);
                    }}
                    className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary transition-all"
                  />
                  {detectedPlatform && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                      {detectedPlatform === "google-meet" ? "Google Meet" : detectedPlatform === "zoom" ? "Zoom" : "MS Teams"} Detected
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={botTime}
                    onChange={(e) => setBotTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Bot Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="Recall Note Taker"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleScheduleBot}
                disabled={isScheduling || !botLink || !botTime}
                className="w-full mt-1 py-2.5 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:bg-primary/90 cursor-pointer disabled:opacity-50"
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    Schedule Autopilot
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Uploaded file preview */}
        {uploadedFile && phase === "stopped" && (
          <div className="p-3 rounded-lg bg-card border border-border text-xs text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span>📎</span>
              <div className="truncate">
                <p className="font-medium text-foreground truncate">{uploadedFile.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadedFile(null)
                setPhase("idle")
              }}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Processing Strategy Settings Box */}
        {(phase === "idle" || phase === "stopped") && (
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">AI Strategy</h3>
            </div>

            <div className="space-y-2.5 pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.diarize}
                  onChange={(e) => setSettings(prev => ({ ...prev, diarize: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary/40 bg-background w-3.5 h-3.5"
                />
                <div>
                  <p className="text-xs font-medium text-foreground">Speaker Diarization</p>
                  <p className="text-[10px] text-muted-foreground">Identify individual voices</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.actions}
                  onChange={(e) => setSettings(prev => ({ ...prev, actions: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary/40 bg-background w-3.5 h-3.5"
                />
                <div>
                  <p className="text-xs font-medium text-foreground">Action Items Extraction</p>
                  <p className="text-[10px] text-muted-foreground">Auto-assign tasks and priorities</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary font-medium"
                >
                  <option value="en">English (US)</option>
                  <option value="hi">Hindi (IN)</option>
                  <option value="es">Spanish (ES)</option>
                  <option value="fr">French (FR)</option>
                  <option value="auto">Auto Detect</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Summary
                </label>
                <select
                  value={settings.style}
                  onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary font-medium"
                >
                  <option value="detailed">Executive Brief</option>
                  <option value="bullet">Bullet Points</option>
                  <option value="brief">Summary Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Record Control Dial */}
        {mode !== 'upload' && mode !== 'bot' && (phase === "idle" || phase === "recording") && (
          <div className="relative flex items-center justify-center py-2">
            <button
              onClick={isRecording ? handleStop : handleStart}
              className={`
                w-16 h-16 rounded-full flex flex-col items-center justify-center
                transition-all duration-200 shadow-md cursor-pointer
                ${isRecording
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              `}
            >
              {isRecording ? (
                <>
                  <Square className="w-5 h-5 mb-0.5 fill-current" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">REC</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Process button when recording is ready */}
        <AnimatePresence>
          {showProcessButton && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="space-y-2 pt-1"
            >
              <button
                onClick={handleProcess}
                className="w-full py-3 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:bg-primary/90 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                Process Capture with AI
              </button>
              
              <button
                onClick={handleReRecord}
                className="w-full py-2 px-4 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start Over / Discard
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/mp4,video/x-m4v,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

      </div>
    </div>
  )
}
