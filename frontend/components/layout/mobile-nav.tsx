'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Swords, Map, Sparkles, User, UploadCloud } from "lucide-react"

export function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Jogar", href: "/praticar", icon: Swords },
    { label: "MedAI", href: "/medai", icon: Sparkles },
    { label: "Trilhas", href: "/trilhas", icon: Map },
    { label: "Contribuir", href: "/contribuir", icon: UploadCloud }, // <--- ADICIONADO
    { label: "Perfil", href: "/perfil", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center px-2 md:hidden z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors
              ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600"}
            `}
          >
            <item.icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}