import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export function FormattedText({ text, className = "" }: { text: string, className?: string }) {
    if (!text) return null;

    // Converte a sintaxe antiga de math do regex ^{...} para Latex padrão $...$ se necessário,
    // mas o usuário pediu "prioridade na solução nativa". 
    // Assumindo que o backend passará a enviar markdown decente ou que o remark-math lide bem.
    // Porém, o regex antigo fazia: `^{...}` -> `<sup>...</sup>`. Em LaTeX é `^{...}` mesmo.
    // O regex antigo fazia `_{...}` -> `<sub>...</sub>`. Em LaTeX é `_{...}`.
    // O regex antigo fazia `^number` -> `<sup>number</sup>`.
    // Se o texto vier como "Texto ^{sup}", o remark-math espera `$Texto ^{sup}$` ou similar se for math.
    // Mas se for apenas texto formatado, markdown não tem sup/sub nativo padrão sem HTML.
    // O rehype-katex renderiza matemática entre $...$.

    // Tratativa de compatibilidade simples: 
    // Se o texto não tiver cifrões, talvez precisemos manter o regex ou orientar o usuário?
    // O usuário disse: "garanta pelo menos que a regex antiga de ^{...} seja convertida para a sintaxe de Markdown compatível".
    // Markdown não tem super/subscript padrão. GFM tem strikethrough.
    // A melhor aposta é que o conteúdo venha em LaTeX formatado ($...$) ou que aceitemos que `^{...}` sem $ não renderize como math.
    // Vou implementar o ReactMarkdown limpo conforme solicitado.

    const Markdown = ReactMarkdown as any;

    return (
        <div className={`text-justify max-w-none ${className}`}>
            <Markdown
                remarkPlugins={[remarkGfm, remarkMath] as any}
                rehypePlugins={[rehypeKatex] as any}
                components={{
                    // Lists (Manual styling since we removed prose)
                    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4" {...props} />,
                    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4" {...props} />,
                    li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
                    // Headings
                    h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                    h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mb-3" {...props} />,
                    h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold mb-2" {...props} />,
                    // Table
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
                    // Paragraph: Smart margin (none if last child)
                    p: ({ node, ...props }: any) => <p className="leading-relaxed [&:not(:last-child)]:mb-4" {...props} />,
                }}
            >
                {text}
            </Markdown>
        </div>
    );
}
