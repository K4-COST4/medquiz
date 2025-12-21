import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { FileUp, Home, LayoutDashboard, User } from 'lucide-react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedQuiz",
  description: "Sua plataforma de estudo. Estudar também é lazer!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-50 text-slate-800 flex flex-col md:flex-row h-screen overflow-hidden`}>
        
        {/* ===================================================
            DESKTOP SIDEBAR (Apenas visível em telas médias/grandes 'md:flex')
           =================================================== */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 z-20">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-[#0cb7f2] tracking-tight">
              MedQuiz
            </h1>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-[#0cb7f2] rounded-xl transition-all">
              <Home size={20} />
              <span className="font-medium">Início</span>
            </Link>

            <Link href="/praticar" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-[#0cb7f2] rounded-xl transition-all">
              <LayoutDashboard size={20} />
              <span className="font-medium">Praticar (em breve)</span>
            </Link>

            <Link href="/erros" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-[#0cb7f2] rounded-xl transition-all">
              <LayoutDashboard size={20} />
              <span className="font-medium">Verificar Erros</span>
            </Link>

            <Link href="/social" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-[#0cb7f2] rounded-xl transition-all">
              <LayoutDashboard size={20} />
              <span className="font-medium">Social (em breve)</span>
            </Link>

            <Link href="/contribuir" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-[#0cb7f2] rounded-xl transition-all">
              <FileUp size={20} />
              <span className="font-medium">Enviar Provas</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-slate-100">
             <Link href="/perfil" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 rounded-xl transition-all">
              <User size={20} />
              <span className="font-medium">Perfil</span>
            </Link>
          </div>
        </aside>

        {/* ===================================================
            MOBILE CONTENT AREA
           =================================================== */}
        <main className="flex-1 overflow-y-auto relative w-full pb-20 md:pb-0">
          {/* Adicionei 'pb-20' (padding-bottom) no mobile para o conteúdo não 
              ficar escondido atrás da barra de navegação inferior */}
          {children}
        </main>

        {/* ===================================================
            MOBILE BOTTOM NAV (Apenas visível em telas pequenas 'md:hidden')
           =================================================== */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          
          <Link href="/" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0cb7f2]">
            <Home size={24} />
            <span className="text-[10px] font-medium">Início</span>
          </Link>

          <Link href="/praticar" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0cb7f2]">
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-medium">Praticar (em breve)</span>
          </Link>

          <Link href="/erros" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0cb7f2]">
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-medium">Verificar Erros</span>
          </Link>

          <Link href="/social" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0cb7f2]">
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-medium">Social (em breve)</span>
          </Link>

          {/* Destaque central para ação principal */}
          <Link href="/contribuir" className="flex flex-col items-center gap-1 text-[#0cb7f2]">
            <div className="bg-blue-50 p-2 rounded-full -mt-6 border-4 border-slate-50 shadow-sm">
                <FileUp size={24} />
            </div>
            <span className="text-[10px] font-medium">Enviar</span>
          </Link>

          <Link href="/perfil" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0cb7f2]">
            <User size={24} />
            <span className="text-[10px] font-medium">Perfil</span>
          </Link>

        </nav>

      </body>
    </html>
  );
}