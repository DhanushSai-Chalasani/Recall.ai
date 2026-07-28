"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import { MeetingProvider } from "@/contexts/meeting-context"

interface AppShellProps {
  children: React.ReactNode
}

/**
 * AppShell — Unified layout wrapper for all authenticated routes.
 * Renders the collapsible sidebar + header + scrollable content area.
 * Used by dashboard, meetings, archive, profile, and upgrade pages.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <MeetingProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </MeetingProvider>
  )
}
