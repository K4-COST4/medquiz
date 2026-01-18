"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors text-sm font-medium p-2 -ml-2 rounded-lg hover:bg-slate-50"
        >
            <ChevronLeft size={18} />
            Voltar
        </button>
    );
}
