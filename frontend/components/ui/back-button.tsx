"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium group"
        >
            <div className="bg-white p-2 rounded-full shadow-sm border border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-50 transition-all">
                <ArrowLeft size={18} />
            </div>
            <span>Voltar</span>
        </button>
    );
}
