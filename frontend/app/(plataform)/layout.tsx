import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* 1. Sidebar (Visível apenas Desktop) */}
      <Sidebar />

      {/* 2. Área Principal (Onde vai o Dashboard) */}
      <main className="flex-1 overflow-y-auto relative w-full scroll-smooth">
        {/* Padding bottom no mobile para não esconder conteúdo atrás da barra */}
        <div className="pb-20 md:pb-8 min-h-screen">
            {children}
        </div>
      </main>

      {/* 3. Mobile Nav (Visível apenas Mobile) */}
      <MobileNav />
      
    </div>
  )
}