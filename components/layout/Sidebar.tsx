"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Mic, Clock, Settings, Menu, X,
  Smile, Frown, HelpCircle,
  PanelLeftClose, PanelLeftOpen,
  Search, Pin, Trash2, Archive, Star,
  MoreHorizontal, Edit2, Download, Share
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import { SettingsModal } from "./SettingsModal"
import { useTheme } from "@/contexts/theme-context"
import { useSubscription } from "@/contexts/subscription-context"

const NAV_ITEMS = [
  { label: "Record",   icon: Mic,     href: "/dashboard" },
  { label: "Meetings", icon: Clock,   href: "/meetings" },
  { label: "Archive",  icon: Archive, href: "/archive" },
]

const SENTIMENT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  aligned:   { icon: Smile,      color: "var(--success)" },
  tense:     { icon: Frown,      color: "var(--destructive)" },
  uncertain: { icon: HelpCircle, color: "var(--warning)" },
  neutral:   { icon: Smile,      color: "var(--muted-foreground)" },
}

export function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [collapsed,    setCollapsed]    = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { isPro } = useSubscription()

  const [meetings, setMeetings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const fetchMeetings = async () => {
    try {
      const res = await fetch("/api/meetings")
      const data = await res.json()
      if (Array.isArray(data)) {
        setMeetings(data)
      }
    } catch (e) {
      console.error("Error fetching meetings in sidebar:", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const savedPinned = localStorage.getItem("pinned_meetings")
    if (savedPinned) {
      try {
        setPinnedIds(JSON.parse(savedPinned))
      } catch (e) {
        console.error(e)
      }
    }

    fetchMeetings()

    window.addEventListener("meetings-updated", fetchMeetings)
    return () => {
      window.removeEventListener("meetings-updated", fetchMeetings)
    }
  }, [])

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        setCollapsed(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const togglePin = (meetingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    let nextPinned: string[]
    if (pinnedIds.includes(meetingId)) {
      nextPinned = pinnedIds.filter(id => id !== meetingId)
    } else {
      nextPinned = [...pinnedIds, meetingId]
    }
    setPinnedIds(nextPinned)
    localStorage.setItem("pinned_meetings", JSON.stringify(nextPinned))
  }

  const deleteMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this meeting?")) return

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setMeetings(prev => prev.filter(m => m.id !== meetingId))
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        
        if (pathname === `/meetings/${meetingId}`) {
          router.push("/meetings")
        }
      } else {
        alert("Failed to delete meeting.")
      }
    } catch (err) {
      console.error(err)
      alert("An error occurred while deleting the meeting.")
    }
  }

  const renameMeeting = async (meetingId: string, currentName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newName = prompt("Enter new meeting name:", currentName)
    if (!newName || newName === currentName) return

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName })
      })
      if (res.ok) {
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, name: newName } : m))
        window.dispatchEvent(new CustomEvent("meetings-updated"))
      } else {
        alert("Failed to rename meeting.")
      }
    } catch (err) {
      console.error(err)
      alert("An error occurred while renaming the meeting.")
    }
  }

  const archiveMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Are you sure you want to archive this meeting?")) return

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insights: { is_archived: true } })
      })
      if (res.ok) {
        setMeetings(prev => prev.map(m => {
          if (m.id === meetingId) {
            return { ...m, insights: { ...(m.insights || {}), is_archived: true } }
          }
          return m
        }))
        window.dispatchEvent(new CustomEvent("meetings-updated"))
        if (pathname === `/meetings/${meetingId}`) {
          router.push("/meetings")
        }
      } else {
        alert("Failed to archive meeting.")
      }
    } catch (err) {
      console.error(err)
      alert("An error occurred while archiving the meeting.")
    }
  }

  const shareMeeting = (meetingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/meetings/${meetingId}`
    navigator.clipboard.writeText(url)
    alert("Link copied to clipboard!")
  }

  const downloadMeeting = (meeting: any, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    let text = `Meeting: ${meeting.name}\n\n`
    if (meeting.tldr) text += `TLDR:\n${meeting.tldr}\n\n`
    if (meeting.action_items?.length) {
      text += `Action Items:\n`
      meeting.action_items.forEach((item: any) => {
        text += `- ${item.description || item}\n`
      })
      text += `\n`
    }
    if (meeting.transcript?.length) {
      text += `Transcript:\n`
      meeting.transcript.forEach((line: any) => {
        text += `[${line.speaker}]: ${line.text}\n`
      })
    }
    
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${meeting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredMeetings = meetings.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !m.insights?.is_archived
  )

  const pinnedMeetings = filteredMeetings.filter(m => pinnedIds.includes(m.id))
  const recentMeetings = filteredMeetings.filter(m => !pinnedIds.includes(m.id))

  // Nav link
  function NavLink({ item }: { item: typeof NAV_ITEMS[0] }) {
    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        title={item.label}
        className={`
          flex items-center gap-3 rounded-md text-xs font-medium transition-all duration-150
          ${collapsed ? "justify-center px-0 py-2 w-9 mx-auto" : "px-2.5 py-2"}
          ${isActive
            ? "bg-sidebar-accent text-sidebar-primary font-semibold"
            : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60"}
        `}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    )
  }

  // Footer button
  function FooterBtn({
    icon: Icon, label, onClick, danger,
  }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
    return (
      <button
        onClick={onClick}
        title={label}
        className={`
          flex items-center gap-3 rounded-md text-xs font-medium transition-all duration-150 w-full
          ${collapsed ? "justify-center px-0 py-2 w-9 mx-auto" : "px-2.5 py-2"}
          ${danger
            ? "text-destructive hover:bg-destructive/10"
            : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60"}
        `}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </button>
    )
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border lg:hidden shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4 text-foreground" />
      </button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.nav
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="hidden lg:flex flex-col flex-shrink-0 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden relative z-30 select-none"
      >
        {/* Header: Logo & Collapse */}
        <div className={`flex items-center border-b border-sidebar-border h-14 px-3.5 ${collapsed ? "justify-center" : "justify-between"}`}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-7.5 h-7.5 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold shadow-xs">
                  <Mic className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-foreground text-lg tracking-tight">
                  Recall<span className="text-primary font-semibold">.ai</span>
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-icon"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="w-7.5 h-7.5 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold"
              >
                <Mic className="w-4.5 h-4.5" />
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-md text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Collapse sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1 rounded-md text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Expand sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nav items */}
        <div className={`flex-1 overflow-y-auto py-2 ${collapsed ? "px-0 flex flex-col items-center gap-0.5" : "px-2 space-y-0.5"}`}>
          {!collapsed && (
            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>
          )}

          {NAV_ITEMS.map(item => <NavLink key={item.label} item={item} />)}

          {/* Recent meetings — only in expanded mode */}
          {!collapsed && (
            <div className="mt-4 pt-3 border-t border-sidebar-border">
              <div className="flex items-center justify-between px-2.5 mb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recents
                </p>
              </div>

              {/* Search bar */}
              <div className="px-2 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-sidebar-accent/50 border border-sidebar-border focus-within:border-primary/50 transition-all">
                  <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pinned section */}
              {pinnedMeetings.length > 0 && (
                <div className="mb-3">
                  <p className="px-2.5 mb-1 text-[9px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5 fill-primary text-primary rotate-45" /> Pinned
                  </p>
                  {pinnedMeetings.map(meeting => {
                    const s = SENTIMENT_ICONS[meeting.insights?.sentiment] || SENTIMENT_ICONS.neutral
                    const isActive = pathname === `/meetings/${meeting.id}`
                    return (
                      <div key={meeting.id} className="group relative flex items-center">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors w-full pr-12 ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-primary font-medium"
                              : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                          }`}
                        >
                          <s.icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                          <span className="truncate flex-1">{meeting.name}</span>
                        </Link>
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={(e) => renameMeeting(meeting.id, meeting.name, e)}>
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => shareMeeting(meeting.id, e)}>
                                <Share className="w-3.5 h-3.5 mr-2" /> Share Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => downloadMeeting(meeting, e)}>
                                <Download className="w-3.5 h-3.5 mr-2" /> Download Notes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => togglePin(meeting.id, e)}>
                                <Pin className="w-3.5 h-3.5 mr-2" /> {pinnedIds.includes(meeting.id) ? "Unpin" : "Pin to top"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => archiveMeeting(meeting.id, e)}>
                                <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => deleteMeeting(meeting.id, e)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Recent section */}
              <div>
                {pinnedMeetings.length > 0 && (
                  <p className="px-2.5 mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    All Recent
                  </p>
                )}
                {recentMeetings.length === 0 && pinnedMeetings.length === 0 && !isLoading && (
                  <p className="px-2.5 py-1.5 text-xs text-muted-foreground italic">No meetings yet</p>
                )}
                {recentMeetings.map(meeting => {
                  const s = SENTIMENT_ICONS[meeting.insights?.sentiment] || SENTIMENT_ICONS.neutral
                  const isActive = pathname === `/meetings/${meeting.id}`
                  return (
                    <div key={meeting.id} className="group relative flex items-center">
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors w-full pr-12 ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                        }`}
                      >
                        <s.icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                        <span className="truncate flex-1">{meeting.name}</span>
                      </Link>
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={(e) => renameMeeting(meeting.id, meeting.name, e)}>
                              <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => shareMeeting(meeting.id, e)}>
                              <Share className="w-3.5 h-3.5 mr-2" /> Share Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => downloadMeeting(meeting, e)}>
                              <Download className="w-3.5 h-3.5 mr-2" /> Download Notes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => togglePin(meeting.id, e)}>
                              <Pin className="w-3.5 h-3.5 mr-2" /> {pinnedIds.includes(meeting.id) ? "Unpin" : "Pin to top"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => archiveMeeting(meeting.id, e)}>
                              <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => deleteMeeting(meeting.id, e)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer: User Profile & Settings */}
        <div className={`border-t border-sidebar-border py-3 ${collapsed ? "px-0 flex flex-col items-center gap-2" : "px-2 space-y-2"}`}>
          {/* User profile link — positioned ABOVE Settings with clean spacing */}
          {!collapsed ? (
            <Link
              href="/profile"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border transition-all group shadow-2xs"
              title="View & Edit Profile"
            >
              <div className="w-7.5 h-7.5 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 border border-primary/20">
                N
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                  N Rishikesh
                </p>
                <p className={`text-[10px] font-medium truncate ${isPro ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {isPro ? "Pro Plan ✨" : "Free Plan"}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/profile"
              className="w-8.5 h-8.5 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
              title="View Profile"
            >
              N
            </Link>
          )}

          <FooterBtn icon={Settings} label="Settings" onClick={() => setSettingsOpen(true)} />
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-nav"
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="fixed top-0 left-0 z-50 w-60 h-screen flex flex-col bg-sidebar border-r border-sidebar-border shadow-xl lg:hidden"
          >
            <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7.5 h-7.5 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  <Mic className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-foreground text-lg tracking-tight">
                  Recall<span className="text-primary font-semibold">.ai</span>
                </span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(item => <NavLink key={item.label} item={item} />)}
            </div>

            <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5">
              <FooterBtn icon={Settings} label="Settings" onClick={() => { setSettingsOpen(true); setMobileOpen(false) }} />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />
    </>
  )
}
