'use client'

import { useEffect, useState } from "react"
import { Flame } from "lucide-react"
import { getUserStreak } from "@/app/actions/streak" 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// O ERRO ESTAVA AQUI: Tem que ter a palavra 'export'
export function StreakCounter() {
  const [streak, setStreak] = useState(0)
  const [hasPlayedToday, setHasPlayedToday] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserStreak()
        setStreak(data.current_streak)
        setHasPlayedToday(data.has_played_today)
      } catch (error) {
        console.error("Erro ao carregar streak", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="w-8 h-8 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-full" />

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`
            flex items-center gap-1 px-3 py-1.5 rounded-full font-bold transition-all cursor-help
            ${hasPlayedToday 
               ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500' 
               : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 grayscale'}
          `}>
            <Flame 
                className={`w-5 h-5 ${hasPlayedToday ? 'fill-orange-500 animate-pulse' : 'fill-slate-300 dark:fill-slate-700'}`} 
            />
            <span>{streak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasPlayedToday ? "Você já praticou hoje! 🔥" : "Pratique hoje para manter a chama acesa!"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}