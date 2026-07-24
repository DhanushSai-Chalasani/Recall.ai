"use client"

import { useState, useRef, useCallback } from "react"

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [activeMode, setActiveMode] = useState<'mic' | 'system' | 'upload' | null>(null)

  const stop = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setActiveMode(null)
    }
  }, [])

  const start = useCallback(async (mode: 'mic' | 'system' | 'upload' = 'mic') => {
    try {
      setError(null)
      setAudioBlob(null)

      let mediaStream: MediaStream
      if (mode === 'system') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error("System audio capture is not supported by this browser.")
        }
        
        // Request screen share with audio
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })

        const audioTracks = displayStream.getAudioTracks()
        if (audioTracks.length === 0) {
          // Stop video tracks immediately if no audio shared
          displayStream.getTracks().forEach(t => t.stop())
          throw new Error("No system audio track shared. Please check the 'Share audio' box in the sharing prompt.")
        }

        // Clean up video track immediately as we only need audio
        displayStream.getVideoTracks().forEach(t => t.stop())
        mediaStream = new MediaStream(audioTracks)
      } else {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      // Attach track onended listener to handle user clicking native "Stop sharing" or disconnecting mic
      mediaStream.getTracks().forEach(track => {
        track.onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setActiveMode(null)
          }
        }
      })

      setStream(mediaStream)
      setActiveMode(mode)

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
        audioBitsPerSecond: 32000 // 32kbps mono stream for optimal vocal compression
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        // Stop all tracks
        mediaStream.getTracks().forEach(t => t.stop())
        setStream(null)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Access denied or not supported"
      setError(msg)
      console.error("Audio recorder error:", err)
    }
  }, [])

  return { isRecording, activeMode, audioBlob, stream, error, start, stop }
}
