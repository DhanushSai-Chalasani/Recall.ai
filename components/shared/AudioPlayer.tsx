"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { formatMinSec } from "@/lib/utils"

interface AudioPlayerProps {
  audioUrl?: string | null
  onSeek?: (time: number) => void
}

export function AudioPlayer({ audioUrl, onSeek }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration))
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime))
    audio.addEventListener("ended", () => setIsPlaying(false))

    const handleSeekEvent = (e: Event) => {
      const customEvent = e as CustomEvent<number>
      if (typeof customEvent.detail === 'number') {
        audio.currentTime = customEvent.detail
        setCurrentTime(customEvent.detail)
        if (audio.paused) {
          audio.play()
          setIsPlaying(true)
        }
      }
    }
    window.addEventListener("seek-audio", handleSeekEvent)

    return () => {
      audio.pause()
      audio.src = ""
      window.removeEventListener("seek-audio", handleSeekEvent)
    }
  }, [audioUrl])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
    onSeek?.(time)
  }, [onSeek])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    seekTo(pct * duration)
  }, [duration, seekTo])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !muted
    setMuted(!muted)
  }, [muted])

  const cycleSpeed = useCallback(() => {
    const speeds = [1, 1.25, 1.5, 2, 0.75]
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length]
    setPlaybackRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [playbackRate])

  const restart = useCallback(() => {
    seekTo(0)
    if (!isPlaying) {
      audioRef.current?.play()
      setIsPlaying(true)
    }
  }, [seekTo, isPlaying])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!audioUrl) return null

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-xs">
      <button
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0 cursor-pointer"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      <span className="text-xs font-mono text-muted-foreground min-w-[36px]">
        {formatMinSec(Math.floor(currentTime))}
      </span>

      <div
        ref={progressRef}
        onClick={handleProgressClick}
        className="flex-1 h-1.5 rounded-full bg-muted cursor-pointer group relative"
      >
        <div
          className="h-full rounded-full bg-primary relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <span className="text-xs font-mono text-muted-foreground min-w-[36px]">
        {formatMinSec(Math.floor(duration))}
      </span>

      <button
        onClick={cycleSpeed}
        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Playback speed"
      >
        {playbackRate}×
      </button>

      <button
        onClick={toggleMute}
        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <button
        onClick={restart}
        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Restart"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
