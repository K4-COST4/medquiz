import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import HeartsWidget from "@/components/HeartsWidget"
import { checkAndRegenerateHearts, refillHeartByPractice } from "./user/actions"
import { ContentWrapper } from "./content-wrapper"

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Verificar Sessão
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  // 2. Buscar Dados do Perfil (Streak)
  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_count")
    .eq("id", user.id)
    .single()

  const streakCount = profile?.streak_count ?? 0

  // 3. Buscar Dados de Vidas (Existente)
  const currentHearts = await checkAndRegenerateHearts()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* 1. Sidebar (Visível apenas Desktop) */}
      <Sidebar streak={streakCount} />

      {/* 2. Área Principal (Onde vai o Dashboard) */}
      <main className="flex-1 overflow-y-auto relative w-full scroll-smooth">
        {/* Header com Vidas (DESATIVADO TEMPORARIAMENTE) */}
        <div className="absolute top-4 right-4 z-50">
          {false && (
            <HeartsWidget
              hearts={currentHearts ?? 5}
              onStartPractice={refillHeartByPractice}
            />
          )}
        </div>

        {/* Padding bottom no mobile para não esconder conteúdo atrás da barra */}
        {/* Wrapper de Conteúdo (Gerencia Padding e Footer) */}
        <ContentWrapper>
          {children}
        </ContentWrapper>
      </main>

      {/* 3. Mobile Nav (Visível apenas Mobile) */}
      <MobileNav streak={streakCount} />

    </div>
  )
}