"use client"

import { motion } from "framer-motion"
import { Circle, Loader2, CheckCircle2 } from "lucide-react"
import type { StepStatus } from "@/lib/types"

interface ProcessingStateProps {
  steps: StepStatus[]
}

export function ProcessingState({ steps }: ProcessingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center p-12 h-full"
    >
      <div className="w-full max-w-sm space-y-4">
        <h3 className="text-base font-semibold text-foreground text-center mb-5">
          Processing meeting capture…
        </h3>

        {steps.map((step, i) => (
          <motion.div
            key={step.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-2.5"
          >
            {step.state === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
            ) : step.state === 'active' ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            )}
            <span className={`text-xs ${
              step.state === 'done'
                ? "text-muted-foreground line-through"
                : step.state === 'active'
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }`}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
