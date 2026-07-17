"use client"

import { motion } from "framer-motion"
import { Clock, Users, FileText, CheckSquare } from "lucide-react"
import { formatMinSec } from "@/lib/utils"
import type { MeetingStats } from "@/lib/types"

interface StatsRowProps {
  stats: MeetingStats
}

const STAT_ITEMS = [
  { key: 'duration', icon: Clock, label: 'Duration', colorClass: 'text-purple-400', format: (v: number) => formatMinSec(v) },
  { key: 'speakerCount', icon: Users, label: 'Speakers', colorClass: 'text-pink-400', format: (v: number) => String(v) },
  { key: 'wordCount', icon: FileText, label: 'Words', colorClass: 'text-cyan-400', format: (v: number) => v.toLocaleString() },
  { key: 'actionItemCount', icon: CheckSquare, label: 'Actions', colorClass: 'text-green-400', format: (v: number) => String(v) },
] as const

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {STAT_ITEMS.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass-panel p-4 rounded-2xl text-center shadow-lg hover:border-white/10 transition-all"
        >
          <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.colorClass}`} />
          <p className="text-xl font-extrabold text-white tracking-tight font-mono">
            {item.format(stats[item.key] ?? 0)}
          </p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{item.label}</p>
        </motion.div>
      ))}
    </div>
  )
}
