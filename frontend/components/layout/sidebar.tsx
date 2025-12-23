'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  Swords, 
  Map,    
  BarChart2, 
  User, 
  Sparkles,
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

export function Sidebar() {
  const pathname = usePathname()

  // Mapeamento dos itens do menu
  const navItems = [
    { label: "Início", href: "/dashboard", icon: Home },
    { label: "Praticar", href: "/praticar", icon: Swords },
    { label: "Trilhas", href: "/trilhas", icon: Map },
    { label: "MedAI", href: "/med-ai", icon: Sparkles, color: "text-violet-500" },
    { label: "Estatísticas", href: "/stats", icon: BarChart2 },
  ]

  return (
    <aside className="hidden md:flex flex-col items-center w-[72px] h-screen py-4 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
      
      {/* LOGO (M de MedQuiz) */}
      <div className="mb-6">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 text-xl">
          M
        </div>
      </div>

      <Separator className="w-10 mb-4 bg-slate-200 dark:bg-slate-700" />

      {/* ÁREA DE NAVEGAÇÃO */}
      <ScrollArea className="flex-1 w-full px-2">
        <nav className="flex flex-col gap-4 items-center">
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => {
              // Verifica se estamos na página exata ou numa sub-página
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={`
                        relative group flex items-center justify-center w-12 h-12 rounded-[24px] 
                        transition-all duration-300 ease-out
                        hover:rounded-[16px] hover:bg-indigo-600 hover:text-white
                        ${isActive 
                          ? "bg-indigo-600 text-white rounded-[16px]" 
                          : "bg-white dark:bg-slate-800 text-slate-500 hover:text-white"
                        }
                        ${!isActive && item.color ? item.color : ""}
                      `}
                    >
                      {/* O "Pill" lateral (Indicador de ativo) */}
                      <div className={`
                        absolute left-0 w-[4px] bg-indigo-600 rounded-r-full transition-all duration-300
                        ${isActive ? "h-8 -ml-3" : "h-2 -ml-4 opacity-0 group-hover:opacity-100 group-hover:h-4 group-hover:-ml-3"}
                      `} />

                      <item.icon size={22} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-bold bg-slate-900 text-white border-slate-800 ml-2">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      <Separator className="w-10 my-4 bg-slate-200 dark:bg-slate-700" />

      {/* RODAPÉ (PERFIL) */}
      <div className="flex flex-col gap-4 items-center pb-4">
        <TooltipProvider>
           <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/perfil" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-300 transition-colors">
                <User size={20} className="text-slate-600 dark:text-slate-400" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Meu Perfil</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

    </aside>
  )
}