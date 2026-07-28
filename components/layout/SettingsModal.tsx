"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sun, Moon, Monitor, Key, User, Trash2, Bell, Shield, Activity, RefreshCw, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  theme: "dark" | "light" | "system"
  onThemeChange: (theme: "dark" | "light" | "system") => void
}

const TABS = [
  { id: "general", label: "General", icon: Monitor },
  { id: "profile", label: "Profile", icon: User },
  { id: "health", label: "Backend Health", icon: Activity },
  { id: "api", label: "API Keys", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "danger", label: "Danger Zone", icon: Shield },
]

export function SettingsModal({ open, onClose, theme, onThemeChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("general")
  const [language, setLanguage] = useState("en")
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyBrowser, setNotifyBrowser] = useState(false)
  const [name, setName] = useState("Rishikesh")
  const [email, setEmail] = useState("rishikesh@example.com")
  const [healthData, setHealthData] = useState<any>(null)
  const [isAuditing, setIsAuditing] = useState(false)

  const runHealthCheck = async () => {
    setIsAuditing(true)
    try {
      const res = await fetch("/api/health")
      const data = await res.json()
      setHealthData(data)
      if (data.status === "healthy") {
        toast.success("Backend Health Audit Passed!", { description: `All services active (${data.latencyMs}ms)` })
      } else {
        toast.warning("Backend Health Degraded", { description: "Some services running in demo fallback mode." })
      }
    } catch (e) {
      toast.error("Health check failed", { description: "Could not reach backend health endpoint." })
    } finally {
      setIsAuditing(false)
    }
  }

  function handleDeleteAccount() {
    if (!confirm("Are you absolutely sure? This will permanently delete your account and all your meetings.")) return
    toast.promise(
      fetch("/api/account/delete", { method: "POST" }),
      {
        loading: "Deleting account...",
        success: "Account deleted.",
        error: "Failed to delete account.",
      }
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                {/* Tabs */}
                <div className="w-full sm:w-40 flex sm:flex-col overflow-x-auto sm:overflow-visible border-b sm:border-b-0 sm:border-r border-border py-2 flex-shrink-0 px-2 sm:px-0">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex-shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-left relative rounded-md sm:rounded-none
                        ${tab.id === "danger" ? "sm:mt-auto ml-auto sm:ml-0 text-destructive" : ""}
                        ${activeTab === tab.id
                          ? tab.id === "danger"
                            ? "bg-destructive/10 text-destructive font-semibold"
                            : "bg-sidebar-accent text-primary font-semibold"
                          : tab.id === "danger"
                            ? "text-destructive/70 hover:text-destructive hover:bg-destructive/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }
                      `}
                    >
                      <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Right content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* General */}
                  {activeTab === "general" && (
                    <div className="space-y-4">
                      <Section title="Appearance">
                        <p className="text-xs text-muted-foreground mb-2.5">Choose your preferred color theme.</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { value: "dark",   label: "Dark",   icon: Moon },
                            { value: "light",  label: "Light",  icon: Sun },
                            { value: "system", label: "System", icon: Monitor },
                          ] as const).map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => onThemeChange(value)}
                              className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                                theme === value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </Section>

                      <Section title="Language">
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary font-medium"
                        >
                          <option value="en">English (US)</option>
                          <option value="hi">Hindi</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                        </select>
                      </Section>
                    </div>
                  )}

                  {/* Profile */}
                  {activeTab === "profile" && (
                    <div className="space-y-4">
                      <Section title="Account Information">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary font-medium"
                            />
                          </div>
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* Backend Health */}
                  {activeTab === "health" && (
                    <div className="space-y-4">
                      <Section title="System Diagnostics">
                        <p className="text-xs text-muted-foreground mb-3">Audit connectivity to Whisper, Groq, and database.</p>
                        <button
                          onClick={runHealthCheck}
                          disabled={isAuditing}
                          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                          {isAuditing ? "Auditing System..." : "Run Health Audit"}
                        </button>

                        {healthData && (
                          <div className="mt-3 p-3 rounded-lg bg-background border border-border space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Overall Status:</span>
                              <span className="font-semibold text-success flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Latency:</span>
                              <span className="font-mono">{healthData.latencyMs}ms</span>
                            </div>
                          </div>
                        )}
                      </Section>
                    </div>
                  )}

                  {/* API Keys */}
                  {activeTab === "api" && (
                    <div className="space-y-4">
                      <Section title="API Configuration">
                        <p className="text-xs text-muted-foreground mb-3">Local API key overrides (Groq, OpenAI, Supabase).</p>
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Groq API Key</label>
                            <input
                              type="password"
                              placeholder="gsk_..."
                              className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">OpenAI API Key</label>
                            <input
                              type="password"
                              placeholder="sk-..."
                              className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs text-foreground outline-none focus:border-primary font-mono"
                            />
                          </div>
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* Notifications */}
                  {activeTab === "notifications" && (
                    <div className="space-y-4">
                      <Section title="Notification Preferences">
                        <div className="space-y-3 pt-1">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div>
                              <p className="text-xs font-medium text-foreground">Email Notifications</p>
                              <p className="text-[10px] text-muted-foreground">Receive summary emails after meetings</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.checked)}
                              className="rounded border-border text-primary focus:ring-primary/40 bg-background w-4 h-4"
                            />
                          </label>

                          <label className="flex items-center justify-between cursor-pointer">
                            <div>
                              <p className="text-xs font-medium text-foreground">Desktop Alerts</p>
                              <p className="text-[10px] text-muted-foreground">Show system notifications when transcript is ready</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={notifyBrowser}
                              onChange={(e) => setNotifyBrowser(e.target.checked)}
                              className="rounded border-border text-primary focus:ring-primary/40 bg-background w-4 h-4"
                            />
                          </label>
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* Danger Zone */}
                  {activeTab === "danger" && (
                    <div className="space-y-4">
                      <Section title="Danger Zone">
                        <p className="text-xs text-muted-foreground mb-3">Irreversible account actions.</p>
                        <button
                          onClick={handleDeleteAccount}
                          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold uppercase tracking-wider hover:bg-destructive/90 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Account Permanently
                        </button>
                      </Section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}
