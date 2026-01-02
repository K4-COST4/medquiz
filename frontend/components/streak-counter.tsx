'use client'

import { Flame } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StreakCounterProps {
  currentStreak: number
}

export function StreakCounter({ currentStreak = 0 }: StreakCounterProps) {
  const hasStreak = currentStreak > 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`
            flex items-center gap-1 px-3 py-1.5 rounded-full font-bold transition-all cursor-help
            ${hasStreak
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}
          `}>
            <Flame
              className={`w-5 h-5 ${hasStreak ? 'fill-currentColor text-orange-500' : 'text-slate-300 dark:text-slate-700'}`}
            />
            <span>{currentStreak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasStreak ? "Você está mandando ver! 🔥" : "Pratique hoje para iniciar sua ofensiva!"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}