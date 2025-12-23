export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Definimos o fundo padrão como slate-950 para evitar "piscar" branco no carregamento
    <main className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      {children}
    </main>
  )
}