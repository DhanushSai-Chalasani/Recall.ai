"use client"

import { motion } from "framer-motion"
import { AlertTriangle, HelpCircle, Smile, Frown } from "lucide-react"
import { getSpeakerColor } from "@/lib/utils"
import type { Insights } from "@/lib/types"

interface InsightsPanelProps {
  insights: Insights
  speakers?: Array<{ id: string; label: string }>
}

const SENTIMENT_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  aligned:   { icon: Smile, color: 'var(--success)', label: 'Aligned' },
  tense:     { icon: Frown, color: 'var(--destructive)', label: 'Tense' },
  uncertain: { icon: HelpCircle, color: 'var(--warning)', label: 'Uncertain' },
  neutral:   { icon: Smile, color: 'var(--muted-foreground)', label: 'Neutral' },
}

export function InsightsPanel({ insights, speakers = [] }: InsightsPanelProps) {
  const sentiment = SENTIMENT_META[insights.sentiment] || SENTIMENT_META.neutral

  return (
    <div className="space-y-4">
      {/* Sentiment */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-card border border-border"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Meeting Sentiment
        </p>
        <div className="flex items-center gap-2.5">
          <sentiment.icon className="w-5 h-5" style={{ color: sentiment.color }} />
          <span className="text-base font-semibold" style={{ color: sentiment.color }}>
            {sentiment.label}
          </span>
        </div>
      </motion.div>

      {/* Risks */}
      {insights.risks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Timeline Risks
          </p>
          <div className="space-y-2">
            {insights.risks.map((risk, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground leading-relaxed">{risk}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Decisions */}
      {insights.decisions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Key Decisions
          </p>
          <ul className="space-y-2">
            {insights.decisions.map((decision, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                <span className="text-success font-bold">✓</span>
                {decision}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Talk Ratio */}
      {Object.keys(insights.talkRatio).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Talk Ratio
          </p>
          <div className="space-y-2.5">
            {Object.entries(insights.talkRatio).map(([speakerId, pct], i) => {
              const speakerLabel = speakers.find(s => s.id === speakerId)?.label || speakerId
              const color = getSpeakerColor(i)
              return (
                <div key={speakerId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{speakerLabel}</span>
                    <span className="text-muted-foreground font-mono">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
