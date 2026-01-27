"use client"

import { usePathname } from "next/navigation"

export function FooterWrapper() {
    const pathname = usePathname()

    // Hide footer on MedAI chat processing to avoid double scroll
    if (pathname?.includes('/medai')) {
        return null
    }

    return (
        <footer className="py-6 text-center text-[10px] text-slate-400">
            <p className="mb-1">© {new Date().getFullYear()} MedQuiz. Todos os direitos reservados.</p>
            <div className="flex justify-center gap-3">
                <a href="/legal/termos" className="hover:text-indigo-500 transition-colors">Termos de Uso</a>
                <span>•</span>
                <a href="/legal/privacidade" className="hover:text-indigo-500 transition-colors">Política de Privacidade</a>
            </div>
        </footer>
    )
}
