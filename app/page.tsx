import Link from "next/link"
import { Mic, Sparkles, FileText, CheckSquare, Zap, ArrowRight, ShieldCheck, Database, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden selection:bg-purple-500/30">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),rgba(236,72,153,0.05),transparent_60%)] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[-10%] w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[350px] h-[350px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] backdrop-blur-md bg-[var(--bg)]/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--text)] font-sans">
            Recall<span className="text-purple-400">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <span className="text-sm font-medium text-[var(--text2)] hover:text-white transition-colors cursor-pointer">
              Log in
            </span>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all border border-purple-500/20">
              Get Started <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 sm:py-32 text-center relative z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-8 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
          AI Meeting Intelligence Engine
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-[var(--text)]">
          Focus on the meeting,<br />
          <span className="text-gradient">we&apos;ll take the notes.</span>
        </h1>

        <p className="text-lg sm:text-xl text-[var(--text2)] mt-8 max-w-2xl leading-relaxed">
          Capture high-fidelity audio directly from your browser. Instantly generate speaker-diarized transcripts, AI summaries, checklist tasks, and query your database via Vector RAG.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full justify-center px-4">
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/35 transition-all border border-purple-400/20 font-bold group">
              Start Recording
              <Mic className="w-5 h-5 ml-2.5 group-hover:scale-110 transition-transform text-pink-200" />
            </Button>
          </Link>
          <Link href="/meetings">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-base border-white/10 hover:bg-white/5 text-[var(--text)] transition-all font-semibold">
              Explore Vault RAG
            </Button>
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-24 w-full px-4">
          {[
            { icon: Mic, label: "System Loopback", desc: "Share room + system audio" },
            { icon: FileText, label: "Fast Transcription", desc: "Powered by Groq Whisper" },
            { icon: Sparkles, label: "AI Insights", desc: "Summaries & timelines" },
            { icon: CheckSquare, label: "Checklists", desc: "Action items extracted" },
            { icon: Database, label: "Vault RAG", desc: "Vector database search" },
          ].map(feat => (
            <div key={feat.label} className="glass-panel glass-panel-hover flex flex-col items-center text-center p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
                <feat.icon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text)]">{feat.label}</h3>
              <p className="text-xs text-[var(--text3)] mt-1 hidden sm:block leading-normal">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-6 text-center text-xs text-[var(--text3)] relative z-10">
        <p>© {new Date().getFullYear()} Recall.ai. All rights reserved. Secured with Supabase SSR Auth & pgvector.</p>
      </footer>
    </div>
  )
}
