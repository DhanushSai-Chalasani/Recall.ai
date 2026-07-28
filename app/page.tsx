import Link from "next/link"
import { Mic, Sparkles, FileText, CheckSquare, ArrowRight, Database } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 border-b border-border backdrop-blur-sm bg-background/90">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Recall<span className="text-primary font-normal">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <span className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1">
              Log in
            </span>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs">
              Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 sm:py-28 text-center relative z-10 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI Meeting Intelligence Engine
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.15] text-foreground">
          Focus on the meeting,<br />
          <span className="text-primary">we&apos;ll handle the notes.</span>
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground mt-6 max-w-xl leading-relaxed">
          Capture high-fidelity audio from your microphone or system sound. Instantly generate speaker-diarized transcripts, summaries, action items, and search your meeting vault with vector RAG.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full justify-center px-4 max-w-md">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-6 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              Start Recording
              <Mic className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/meetings" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 text-xs border-border text-foreground hover:bg-muted font-medium">
              Explore Vault RAG
            </Button>
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-16 w-full text-left">
          {[
            { icon: Mic, label: "System Audio", desc: "Room & system sound" },
            { icon: FileText, label: "Transcription", desc: "Whisper-v3 accuracy" },
            { icon: Sparkles, label: "AI Summaries", desc: "Structured timelines" },
            { icon: CheckSquare, label: "Action Items", desc: "Auto-extracted tasks" },
            { icon: Database, label: "Vault RAG", desc: "Vector search index" },
          ].map(feat => (
            <div key={feat.label} className="p-4 rounded-xl border border-border bg-card shadow-xs">
              <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-2.5">
                <feat.icon className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">{feat.label}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground relative z-10">
        <p>© {new Date().getFullYear()} Recall.ai. All rights reserved. Built with Next.js 16 & Electron.</p>
      </footer>
    </div>
  )
}
