
import { getOrGenerateSummary } from "@/app/actions/summary-service";
import { BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { BackButton } from "@/components/ui/back-button";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";

// Configuração de Estilo para o Markdown (Prose)
const MARKDOWN_STYLES = "prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-violet-700 prose-li:text-slate-600 prose-em:text-slate-500 prose-a:text-violet-600 hover:prose-a:text-violet-500 text-justify";

export default async function SummaryPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const resolvedParams = await params;
    const lessonId = resolvedParams.lessonId;

    // Busca o resumo no servidor (pode demorar na primeira vez se estiver gerando)
    const result = await getOrGenerateSummary(lessonId);

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans selection:bg-violet-100 selection:text-violet-900">
            {/* Navbar Minimalista de Leitura */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <BackButton />

                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-2">
                        <BookOpen size={12} />
                        Modo Leitura
                    </span>

                    <div className="w-10" /> {/* Spacer para centralizar */}
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
                {!result.success ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                            <BookOpen size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar resumo</h2>
                        <p className="text-slate-500 max-w-md">
                            {result.error || "Ocorreu um problema inesperado. Tente novamente mais tarde."}
                        </p>
                    </div>
                ) : (
                    <article className="animate-in fade-in duration-700 slide-in-from-bottom-4">
                        {/* Renderização do Markdown */}
                        <div className={MARKDOWN_STYLES}>
                            {(() => {
                                const Markdown = ReactMarkdown as any;
                                return (
                                    <Markdown
                                        remarkPlugins={[remarkGfm, remarkMath] as any}
                                        rehypePlugins={[rehypeKatex] as any}
                                        components={{
                                            table: ({ node, ...props }: any) => (
                                                <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
                                                    <table className="min-w-full divide-y divide-slate-200" {...props} />
                                                </div>
                                            ),
                                            thead: ({ node, ...props }: any) => <thead className="bg-slate-100" {...props} />,
                                            tbody: ({ node, ...props }: any) => <tbody className="bg-white divide-y divide-slate-200" {...props} />,
                                            tr: ({ node, ...props }: any) => <tr className="even:bg-slate-50" {...props} />,
                                            th: ({ node, ...props }: any) => (
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider" {...props} />
                                            ),
                                            td: ({ node, ...props }: any) => (
                                                <td className="px-6 py-4 whitespace-normal text-sm text-slate-600" {...props} />
                                            ),
                                            p: ({ node, ...props }: any) => <p className="mb-4 text-justify leading-relaxed" {...props} />,
                                        }}
                                    >
                                        {result.data || ""}
                                    </Markdown>
                                );
                            })()}
                        </div>

                        {/* Footer da Leitura */}
                        <div className="mt-16 pt-8 border-t border-slate-100 flex items-center justify-between text-sm text-slate-400">
                            <span>Gerado por MedAI</span>
                            <ScrollToTopButton />
                        </div>
                    </article>
                )}
            </main>
        </div >
    );
}

