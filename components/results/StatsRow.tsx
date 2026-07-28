"use client"

import { motion } from "framer-motion"
import { Clock, Users, FileText, CheckSquare } from "lucide-react"
import { formatMinSec } from "@/lib/utils"
import type { MeetingStats } from "@/lib/types"

interface StatsRowProps {
  stats: MeetingStats
}

const STAT_ITEMS = [
  { key: 'duration', icon: Clock, label: 'Duration', format: (v: number) => formatMinSec(v) },
  { key: 'speakerCount', icon: Users, label: 'Speakers', format: (v: number) => String(v) },
  { key: 'wordCount', icon: FileText, label: 'Words', format: (v: number) => v.toLocaleString() },
  { key: 'actionItemCount', icon: CheckSquare, label: 'Actions', format: (v: number) => String(v) },
] as const

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {STAT_ITEMS.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card border border-border p-3.5 rounded-xl text-center shadow-xs"
        >
          <item.icon className="w-4 h-4 mx-auto mb-1.5 text-primary" />
          <p className="text-lg font-semibold text-foreground tracking-tight font-mono">
            {item.format(stats[item.key] ?? 0)}
          </p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{item.label}</p>
        </motion.div>
      ))}
    </div>
  )
}
