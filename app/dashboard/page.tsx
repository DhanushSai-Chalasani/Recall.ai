"use client"

import { AudioRecorder } from "@/components/recorder/AudioRecorder"

export default function DashboardPage() {
  return (
    <div className="flex flex-1 overflow-y-auto overflow-x-hidden relative bg-background h-full min-h-[calc(100vh-3.5rem)]">
      <AudioRecorder />
    </div>
  )
}
