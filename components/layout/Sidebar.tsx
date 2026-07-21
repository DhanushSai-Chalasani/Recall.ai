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

const NAV_ITEMS = [
  { label: "Record",   icon: Mic,     href: "/dashboard" },
  { label: "Meetings", icon: Clock,   href: "/meetings" },
  { label: "Archive",  icon: Archive, href: "/archive" },
]

const SENTIMENT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  aligned:   { icon: Smile,      color: "var(--green)" },
  tense:     { icon: Frown,      color: "var(--red)" },
  uncertain: { icon: HelpCircle, color: "var(--amber)" },
  neutral:   { icon: Smile,      color: "var(--text3)" },
}

export function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [collapsed,    setCollapsed]    = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { theme, setTheme } = useTheme()

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

  // ─── shared nav link ─────────────────────────────────────────────
  function NavLink({ item }: { item: typeof NAV_ITEMS[0] }) {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        title={item.label}
        className={`
          flex items-center gap-3 rounded-lg text-sm transition-all duration-150
          ${collapsed ? "justify-center px-0 py-2.5 w-10 mx-auto" : "px-3 py-2.5"}
          ${isActive
            ? "bg-[var(--accent)]/12 text-[var(--accent)] font-medium"
            : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]"}
        `}
      >
        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    )
  }

  // ─── icon-only footer button ──────────────────────────────────────
  function FooterBtn({
    icon: Icon, label, onClick, danger,
  }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
    return (
      <button
        onClick={onClick}
        title={label}
        className={`
          flex items-center gap-3 rounded-lg text-sm transition-all duration-150 w-full
          ${collapsed ? "justify-center px-0 py-2.5 w-10 mx-auto" : "px-3 py-2.5"}
          ${danger
            ? "text-[var(--red)] hover:bg-[var(--red)]/8"
            : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]"}
        `}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </button>
    )
  }

  return (
    <>
      {/* ── Mobile hamburger ─────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] lg:hidden shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-[var(--text)]" />
      </button>

      {/* ── Mobile backdrop ──────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ──────────────────────────── */}
      <motion.nav
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="hidden lg:flex flex-col flex-shrink-0 h-screen border-r border-[var(--border)] bg-[var(--bg2)] overflow-hidden relative z-30"
      >
        {/* Header: logo + collapse */}
        <div className={`flex items-center border-b border-[var(--border)] h-14 px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                  <Mic className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-[var(--text)] text-sm tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
                  Recall<span className="text-[var(--accent2)] font-light">.ai</span>
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-icon"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center"
              >
                <Mic className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed (at top of nav area) */}
        {collapsed && (
          <div className="flex justify-center pt-3 pb-1">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nav items */}
        <div className={`flex-1 overflow-y-auto py-3 ${collapsed ? "px-0 flex flex-col items-center gap-1" : "px-3 space-y-0.5"}`}>
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text3)]">
              Menu
            </p>
          )}

          {NAV_ITEMS.map(item => <NavLink key={item.label} item={item} />)}

          {/* Recent meetings — only in expanded mode */}
          {!collapsed && (
            <div className="mt-5">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text3)]">
                Recent
              </p>

              {/* Search bar */}
              <div className="px-3 mb-3">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg3)]/50 border border-[var(--border)] focus-within:border-[var(--accent)]/30 transition-all">
                  <Search className="w-3.5 h-3.5 text-[var(--text3)] flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search recent..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-[var(--text)] outline-none w-full placeholder:text-[var(--text3)]"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="text-[var(--text3)] hover:text-[var(--text2)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pinned section */}
              {pinnedMeetings.length > 0 && (
                <div className="mb-4">
                  <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--accent2)] flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5 fill-[var(--accent2)] text-[var(--accent2)] rotate-45" /> Pinned
                  </p>
                  {pinnedMeetings.map(meeting => {
                    const s = SENTIMENT_ICONS[meeting.insights?.sentiment] || SENTIMENT_ICONS.neutral
                    const isActive = pathname === `/meetings/${meeting.id}`
                    return (
                      <div key={meeting.id} className="group relative flex items-center">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors w-full pr-14 ${
                            isActive
                              ? "bg-[var(--accent)]/12 text-[var(--accent)] font-medium"
                              : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]"
                          }`}
                        >
                          <s.icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                          <span className="truncate flex-1">{meeting.name}</span>
                        </Link>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-10 bg-gradient-to-l from-[var(--bg2)] via-[var(--bg2)] to-transparent pl-6 pr-1 py-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={(e) => renameMeeting(meeting.id, meeting.name, e)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => shareMeeting(meeting.id, e)}>
                                <Share className="w-4 h-4 mr-2" /> Share Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => downloadMeeting(meeting, e)}>
                                <Download className="w-4 h-4 mr-2" /> Download Notes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => togglePin(meeting.id, e)}>
                                <Pin className="w-4 h-4 mr-2" /> {pinnedIds.includes(meeting.id) ? "Unpin" : "Pin to top"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => archiveMeeting(meeting.id, e)}>
                                <Archive className="w-4 h-4 mr-2" /> Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => deleteMeeting(meeting.id, e)} className="text-red-500 focus:bg-red-500/10 focus:text-red-500">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
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
                  <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text3)]">
                    All Recent
                  </p>
                )}
                {recentMeetings.length === 0 && pinnedMeetings.length === 0 && !isLoading && (
                  <p className="px-3 py-2 text-xs text-[var(--text3)] italic">No meetings found</p>
                )}
                {recentMeetings.map(meeting => {
                  const s = SENTIMENT_ICONS[meeting.insights?.sentiment] || SENTIMENT_ICONS.neutral
                  const isActive = pathname === `/meetings/${meeting.id}`
                  return (
                    <div key={meeting.id} className="group relative flex items-center">
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors w-full pr-14 ${
                          isActive
                            ? "bg-[var(--accent)]/12 text-[var(--accent)] font-medium"
                            : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]"
                        }`}
                      >
                        <s.icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                        <span className="truncate flex-1">{meeting.name}</span>
                      </Link>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-10 bg-gradient-to-l from-[var(--bg2)] via-[var(--bg2)] to-transparent pl-6 pr-1 py-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => renameMeeting(meeting.id, meeting.name, e)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => shareMeeting(meeting.id, e)}>
                              <Share className="w-4 h-4 mr-2" /> Share Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => downloadMeeting(meeting, e)}>
                              <Download className="w-4 h-4 mr-2" /> Download Notes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => togglePin(meeting.id, e)}>
                              <Pin className="w-4 h-4 mr-2" /> {pinnedIds.includes(meeting.id) ? "Unpin" : "Pin to top"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => archiveMeeting(meeting.id, e)}>
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => deleteMeeting(meeting.id, e)} className="text-red-500 focus:bg-red-500/10 focus:text-red-500">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
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

        {/* Footer: Settings only (theme is inside Settings > General) */}
        <div className={`border-t border-[var(--border)] py-2 ${collapsed ? "px-0 flex flex-col items-center gap-1" : "px-3 space-y-0.5"}`}>
          <FooterBtn icon={Settings} label="Settings" onClick={() => setSettingsOpen(true)} />

          {/* User pill — expanded only */}
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/10 shadow-[0_0_15px_rgba(165,148,249,0.05)]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/10 shadow-[0_0_10px_rgba(124,110,240,0.3)]">
                R
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text)] truncate leading-tight">Rishikesh</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-amber-400 tracking-wider uppercase">Premium</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.nav>

      {/* ── Mobile Drawer ────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-nav"
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 left-0 z-50 w-60 h-screen flex flex-col bg-[var(--bg2)] border-r border-[var(--border)] shadow-2xl lg:hidden"
          >
            <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center">
                  <Mic className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-[var(--text)] text-sm tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
                  Recall<span className="text-[var(--accent2)] font-light">.ai</span>
                </span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-[var(--text3)] hover:bg-[var(--bg3)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(item => <NavLink key={item.label} item={item} />)}
            </div>

            <div className="px-3 py-2 border-t border-[var(--border)] space-y-0.5">
              <FooterBtn icon={Settings} label="Settings" onClick={() => { setSettingsOpen(true); setMobileOpen(false) }} />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ── Settings Modal ───────────────────────────── */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />
    </>
  )
}
