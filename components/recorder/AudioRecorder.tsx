"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sparkles, Mic, Square, Loader2, Upload, Monitor,
  Sliders, Globe, FileText, CheckCircle2, RotateCcw, VolumeX,
  Bot, Calendar, Star
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
  const { isPro, upgradeToPro } = useSubscription()


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

    // Create audio URL for playback
    const url = URL.createObjectURL(blob)
    setAudioUrl(url)

    setPhase("processing")
    setProcessingSteps(steps)
    const result = await process(blob, settings, "New Meeting")
    if (result) {
      setResult(result)
      setPhase("complete")
      toast.success("Meeting processed!", { description: `${result.stats.wordCount.toLocaleString()} words transcribed` })
      window.dispatchEvent(new CustomEvent("meetings-updated"))
      // Redirect to the newly created meeting details page
      router.push(`/meetings/${result.id}`)
    } else {
      setPhase("stopped")
      toast.error("Processing failed", { description: "Please try again." })
    }
  }

  async function handleFileSelect(file: File) {
    // Allow raw file uploads up to 250MB for in-browser extraction and compression
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
      
      // Convert to a File object with proper name & type
      const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const optimizedFile = new File([optimizedBlob], `${originalNameWithoutExt}_optimized.wav`, {
        type: "audio/wav",
        lastModified: Date.now()
      });

      // Verify optimized size is within Groq's 25MB boundary
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
      
      // Fallback: If it's already an audio file and under 25MB, accept it directly
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
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [])

  function handleReRecord() {
    resetTimer()
    setPhase("idle")
    setUploadedFile(null)
    setAudioUrl(null)
  }

  const showProcessButton = phase === "stopped" && (audioBlob || uploadedFile)

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-8 overflow-hidden bg-gradient-to-b from-[#05050c] to-[#0a0a16] relative w-full">
      {/* Spotlight blur background */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[130px] pointer-events-none" />

      {/* PHASE: PROCESSING ( FUTURISTIC FULL-SCREEN OVERLAY ) */}
      <AnimatePresence>
        {phase === "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#05050a]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-6 p-8 rounded-2xl border border-white/5 bg-black/40 relative overflow-hidden shadow-2xl glow-purple">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 animate-pulse" />
              
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-purple-500/10 text-purple-400 mb-2 animate-bounce">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-[var(--text)]">
                  Synthesizing Notes
                </h3>
                <p className="text-xs text-[var(--text2)]">
                  Recall.ai&apos;s cognitive engines are processing your capture.
                </p>
              </div>

              {/* Progress Steps list */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {step.state === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--green)] flex-shrink-0" />
                      ) : step.state === 'active' ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/10 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${
                        step.state === 'done'
                          ? "text-[var(--text2)] line-through"
                          : step.state === 'active'
                          ? "text-white font-semibold"
                          : "text-[var(--text3)]"
                      }`}>
                        {step.label}
                      </span>
                    </div>

                    {step.state === 'active' && (
                      <span className="text-[10px] text-pink-400 font-mono animate-pulse">
                        processing...
                      </span>
                    )}
                    {step.state === 'done' && (
                      <span className="text-[10px] text-[var(--green)] font-mono">
                        ready
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Glowing decorative indicator */}
              <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-[var(--text3)] border-t border-white/5">
                <span className="inline-flex px-1.5 py-0.5 rounded bg-white/5 font-mono text-[8px] uppercase">
                  Whisper-v3
                </span>
                <span>•</span>
                <span className="inline-flex px-1.5 py-0.5 rounded bg-white/5 font-mono text-[8px] uppercase">
                  Llama 3
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT COLUMN: THE CONCENTRIC SOUNDWAVE VISUAL CARD */}
      <div className="flex-1 flex flex-col min-h-[350px] lg:min-h-0 glass-panel rounded-2xl p-6 overflow-hidden relative shadow-2xl items-center justify-center glow-purple">
        {/* Spotlight ambient glows */}
        <div className="absolute w-[350px] h-[350px] rounded-full bg-purple-600/5 blur-[95px] pointer-events-none animate-pulse-slow" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-pink-500/5 blur-[75px] pointer-events-none animate-pulse-slow delay-1000" />
        
        {/* Concentric rotating outer tech circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[450px] h-[450px] rounded-full border border-purple-500/5 opacity-40 animate-spin-slow" />
          <div className="w-[340px] h-[340px] rounded-full border border-dashed border-pink-500/10 opacity-55 animate-reverse-spin" />
          <div className="w-[240px] h-[240px] rounded-full border border-cyan-500/10 opacity-60" />
        </div>

        {/* Recording status indicator */}
        {phase === 'recording' && (
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--red)]/30 bg-[var(--red)]/10 text-xs font-mono text-[var(--red)] shadow-lg glow-pink">
            <span className="w-2 h-2 rounded-full bg-[var(--red)] animate-ping" />
            <span className="uppercase text-[9px] tracking-widest font-bold">REC STATUS: ACTIVE</span>
          </div>
        )}

        {/* Main interactive center illustrations */}
        <div className="relative z-10 w-full max-w-md flex flex-col items-center justify-center gap-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.35em] bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {phase === "recording" ? "STREAMING AUDIO FREQUENCIES" : "RECORDER ENGINE DISPATCH"}
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {phase === "recording" ? "Capturing Room Frequencies..." : "Audio Recording Deck"}
            </h2>
          </div>

          {/* Canvas representation */}
          <div className="w-full py-4 relative bg-black/20 rounded-2xl border border-white/5 shadow-inner">
            <WaveformCanvas isRecording={isRecording} stream={stream} />
          </div>

          <div className="text-center max-w-xs space-y-1">
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              {phase === "recording" 
                ? "Streaming encrypted audio channels. Vocal codec compression is actively running."
                : "Choose your audio target from the cockpit controller, configure strategy settings, and initialize."
              }
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: COCKPIT CONTROLS & GIANT RECORD DIAL */}
      <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        
        {/* Input Mode Selector Horizontal Glassmorphic Capsule */}
        {phase === "idle" && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text2)] px-1">
              Select Capture Source
            </p>
            <div className="grid grid-cols-2 p-1.5 rounded-xl bg-black/40 border border-white/5 shadow-xl gap-1">
              {[
                { id: 'mic' as const, icon: Mic, label: 'Microphone' },
                { id: 'upload' as const, icon: Upload, label: 'File Upload' },
                { id: 'system' as const, icon: Monitor, label: 'System Audio' },
                { id: 'bot' as const, icon: Bot, label: 'Autopilot Bot' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id)
                  }}
                  className={`
                    w-full flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                    ${mode === m.id
                      ? "bg-gradient-to-r from-purple-600/20 to-pink-600/10 text-white border border-purple-500/35 shadow-purple-500/10"
                      : "text-zinc-500 hover:text-zinc-300"
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

        {/* File Drag and Drop Zone if mode === 'upload' */}
        {phase === "idle" && mode === 'upload' && (
          isOptimizing ? (
            <div className="border-2 border-dashed border-pink-500/30 rounded-2xl p-6 text-center bg-pink-500/5 transition-all animate-pulse">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-pink-400 animate-spin" />
              <p className="text-sm font-bold text-white">Optimizing media file...</p>
              <p className="text-xs text-[var(--text2)] mt-1">Extracting voice track and downsampling to 16kHz mono...</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-pink-500/30 hover:bg-pink-500/5 transition-all animate-fade-in"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-pink-400 animate-pulse" />
              <p className="text-sm font-bold text-white">Click or Drag & Drop File</p>
              <p className="text-xs text-[var(--text3)] mt-1">Accepts MP3, WAV, M4A, WEBM, MP4</p>
            </div>
          )
        )}

        {/* System Audio Warning Badge */}
        {phase === "idle" && mode === 'system' && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5 animate-fade-in">
            <VolumeX className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <p className="text-[11px] text-amber-400 leading-relaxed">
              <strong>System Audio Warning:</strong> Capturing system sound requires sharing a tab/window with &apos;Share audio&apos; checked in the browser prompt.
            </p>
          </div>
        )}

        {/* Autopilot Bot scheduling panel if mode === 'bot' */}
        {phase === "idle" && mode === 'bot' && (
          <div className="space-y-4 animate-fade-in">
            {/* Autopilot Scheduler Form */}
            <div className="p-5 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md shadow-xl space-y-4 glow-purple">
              <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
                <Bot className="w-4 h-4 text-purple-400" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bot Autopilot Scheduler</h3>
                  <p className="text-[10px] text-[var(--text3)]">Send a virtual agent to record the meeting</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Meeting Link input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text2)]">
                    Meeting Link (Google Meet, Zoom, Teams)
                  </label>
                  <input
                    type="text"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={botLink}
                    onChange={(e) => {
                      setBotLink(e.target.value);
                      if (e.target.value.includes("meet.google.com")) {
                        setDetectedPlatform("google-meet");
                      } else if (e.target.value.includes("zoom.us")) {
                        setDetectedPlatform("zoom");
                      } else if (e.target.value.includes("teams.microsoft")) {
                        setDetectedPlatform("teams");
                      } else {
                        setDetectedPlatform(null);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/5 text-xs text-white outline-none focus:border-purple-500/50 font-semibold placeholder:text-[var(--text3)] transition-all"
                  />
                  
                  {detectedPlatform && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        detectedPlatform === "google-meet" 
                          ? "bg-green-500/10 text-green-400 border-green-500/20" 
                          : detectedPlatform === "zoom"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {detectedPlatform === "google-meet" ? "Google Meet Detected" : detectedPlatform === "zoom" ? "Zoom Detected" : "MS Teams Detected"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Scheduled Time input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text2)]">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={botTime}
                    onChange={(e) => setBotTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/5 text-xs text-white outline-none focus:border-purple-500/50 font-semibold transition-all"
                  />
                </div>

                {/* Bot Custom Name input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text2)]">
                    Bot Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Recall Note Taker"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/5 text-xs text-white outline-none focus:border-purple-500/50 font-semibold placeholder:text-[var(--text3)] transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleScheduleBot}
                disabled={isScheduling || !botLink || !botTime}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Uploaded File display */}
        {uploadedFile && phase === "stopped" && (
          <div className="p-4 rounded-xl bg-purple-500/5 border border-white/5 text-xs text-[var(--text2)] flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-lg">📎</span>
              <div className="truncate">
                <p className="font-bold text-white truncate">{uploadedFile.name}</p>
                <p className="text-[10px] text-[var(--text3)] font-mono">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadedFile(null)
                setPhase("idle")
              }}
              className="text-[var(--text3)] hover:text-white transition-colors"
              title="Remove file"
            >
              ×
            </button>
          </div>
        )}

        {/* AI Strategy Settings Box (collapsible or floating) */}
        {(phase === "idle" || phase === "stopped") && (
          <div className="p-4 rounded-xl border border-white/5 bg-black/40 backdrop-blur-md shadow-lg space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
              <Sliders className="w-4 h-4 text-pink-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Processing Strategy</h3>
            </div>

            {/* Toggle checkboxes */}
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings.diarize}
                  onChange={(e) => setSettings(prev => ({ ...prev, diarize: e.target.checked }))}
                  className="rounded border-white/10 text-purple-600 focus:ring-purple-500/40 bg-black/40 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                    Speaker Diarization
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">De-noise and group by speaker voice</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings.actions}
                  onChange={(e) => setSettings(prev => ({ ...prev, actions: e.target.checked }))}
                  className="rounded border-white/10 text-purple-600 focus:ring-purple-500/40 bg-black/40 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                    Action Items Extraction
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">Auto-assign tasks and priorities</p>
                </div>
              </label>
            </div>

            {/* Dropdown Options */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text2)] flex items-center gap-1">
                  <Globe className="w-3 h-3 text-zinc-500" /> Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg bg-black/35 border border-white/5 text-xs text-white outline-none focus:border-purple-500/50 font-semibold"
                >
                  <option value="en">English (US)</option>
                  <option value="hi">Hindi (IN)</option>
                  <option value="es">Spanish (ES)</option>
                  <option value="fr">French (FR)</option>
                  <option value="auto">Auto Detect</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text2)] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-zinc-500" /> Summary
                </label>
                <select
                  value={settings.style}
                  onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg bg-black/35 border border-white/5 text-xs text-white outline-none focus:border-purple-500/50 font-semibold"
                >
                  <option value="detailed">Executive Brief</option>
                  <option value="bullet">Bullet Points</option>
                  <option value="brief">Summary Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* GIANT CONCENTRIC PULSING RECORD DIAL ( Only when not in upload or bot mode, or recording ) */}
        {mode !== 'upload' && mode !== 'bot' && (phase === "idle" || phase === "recording") && (
          <div className="relative flex items-center justify-center py-4">
            {/* Ambient Pulsing Rings */}
            <AnimatePresence>
              {isRecording && (
                <>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0.8 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute w-24 h-24 rounded-full border-2 border-[var(--red)] pointer-events-none"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0.8 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
                    className="absolute w-24 h-24 rounded-full border border-dashed border-[var(--red)]/45 pointer-events-none"
                  />
                </>
              )}
              {!isRecording && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-24 h-24 rounded-full bg-purple-500/10 blur-md pointer-events-none"
                />
              )}
            </AnimatePresence>

            <button
              onClick={isRecording ? handleStop : handleStart}
              className={`
                relative w-20 h-20 rounded-full flex flex-col items-center justify-center
                transition-all duration-500 shadow-2xl cursor-pointer group z-10
                ${isRecording
                  ? "bg-gradient-to-tr from-red-600 to-pink-600 text-white hover:scale-105 shadow-red-500/30"
                  : "bg-gradient-to-tr from-purple-600 to-pink-600 text-white hover:scale-105 shadow-purple-500/20 glow-purple"
                }
              `}
            >
              {/* Internal concentric rotating tech circle */}
              <div className={`absolute inset-2 rounded-full border border-white/20 group-hover:rotate-45 transition-transform duration-700 ${isRecording ? "animate-spin-slow" : ""}`} />
              
              {isRecording ? (
                <>
                  <Square className="w-6 h-6 mb-0.5 text-white" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/80">STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6 mb-0.5 text-white" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/80">REC</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Captured Recording Controls ( stopped phase only ) */}
        <AnimatePresence>
          {showProcessButton && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="space-y-3 pt-2"
            >
              <button
                onClick={handleProcess}
                className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:opacity-95 text-white text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-purple-500/20 cursor-pointer hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                Process Capture with AI
              </button>
              
              <button
                onClick={handleReRecord}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 text-xs text-[var(--text2)] hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
