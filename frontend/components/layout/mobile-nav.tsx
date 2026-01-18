'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Swords, Map, Sparkles, User, UploadCloud } from "lucide-react"
import { StreakCounter } from "@/components/streak-counter" // <--- Importado

interface MobileNavProps {
  streak?: number
}

export function MobileNav({ streak }: MobileNavProps) {
  const pathname = usePathname()

  const navItems = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Jogar", href: "/praticar", icon: Swords },
    { label: "MedAI", href: "/medai", icon: Sparkles },
    { label: "Trilhas", href: "/trilhas", icon: Map },
    { label: "Add", href: "/contribuir", icon: UploadCloud }, // Encurtei para "Add" para caber melhor
    { label: "Perfil", href: "/perfil", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center px-1 md:hidden z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto">

      {/* Itens de Navegação */}
      {navItems.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center min-w-[3.5rem] h-full gap-1 transition-colors
              ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600"}
            `}
          >
            <item.icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-medium truncate w-full text-center">{item.label}</span>
          </Link>
        )
      })}

      {/* Foguinho no Mobile (Separador visual) */}
      <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

      <div className="flex items-center justify-center pr-2 scale-90">
        <StreakCounter currentStreak={streak || 0} />
      </div>

    </nav>
  )
}