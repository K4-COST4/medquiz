'use client';
// Client component for Dashboard Omnibox

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardOmnibox() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        // Force URI encoding to handle special characters clearly
        const encodedQuery = encodeURIComponent(query.trim());
        router.push(`/medai?initialQuery=${encodedQuery}`);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full relative group/input">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within/input:text-white transition-colors">
                <Bot size={24} />
            </div>

            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Como tratar Insuficiência Cardíaca Aguda?"
                className="w-full h-16 pl-14 pr-32 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/30 transition-all text-lg shadow-inner"
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !query.trim()}
                    className="bg-white text-indigo-600 hover:bg-white/90 font-bold rounded-lg px-4 h-11 transition-all flex items-center gap-2"
                >
                    {isLoading ? "Indo..." : (
                        <>
                            Perguntar <ArrowRight size={16} />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
