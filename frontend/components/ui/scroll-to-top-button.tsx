"use client";

export function ScrollToTopButton() {
    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:text-violet-600 transition-colors"
        >
            Voltar ao topo
        </button>
    );
}
