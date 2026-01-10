import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EstatisticaPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
            <div className="p-6 bg-slate-50 rounded-full">
                <BarChart3 className="w-16 h-16 text-slate-300" />
            </div>
            <div className="space-y-2 flex flex-col items-center">
                <Badge variant="secondary" className="mb-2">EM BREVE</Badge>
                <h1 className="text-2xl font-bold tracking-tight">Estatísticas em Construção</h1>
                <p className="text-muted-foreground max-w-[400px]">
                    Estamos preparando gráficos detalhados para você acompanhar sua evolução nas trilhas e flashcards.
                </p>
            </div>
            <Button variant="outline" asChild>
                <Link href="/dashboard">Voltar para o Início</Link>
            </Button>
        </div>
    );
}
