import { getTrackDescription } from "../../actions";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Map, Bot } from "lucide-react";


// 1. MUDANÇA AQUI: Import do seu pacote atual
import Markdown from 'markdown-to-jsx'; 

export default async function TrackInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await getTrackDescription(resolvedParams.id);

  if (data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-500 font-medium">
        Ocorreu um erro: {data.error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Navegação */}
        <Link 
          href={`/trilha/${resolvedParams.id}`} 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-violet-600 mb-8 font-bold transition-colors text-sm uppercase tracking-wide"
        >
          <ArrowLeft size={18} />
          Voltar para o Mapa
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-black uppercase tracking-wider">
              <Map size={14} />
              Briefing da Missão
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <Bot size={12} />
              <span>AI GENERATED • GEMINI 3.0</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight">
            {data.title}
          </h1>
        </header>

        {/* Conteúdo Gerado */}
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-white ring-1 ring-slate-100">
          
          {/* A classe 'prose' continua fazendo a mágica do estilo, independente da lib */}
          <div className="prose prose-slate prose-lg max-w-none 
            prose-headings:font-black prose-headings:text-slate-800 prose-headings:mb-4 prose-headings:mt-8
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-li:text-slate-600 prose-li:marker:text-violet-400
            prose-strong:text-violet-700 prose-strong:font-bold">
            
            {/* 2. MUDANÇA AQUI: Componente da sua lib */}
            <Markdown>{data.description || ""}</Markdown>
          
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex justify-end">
            <Link 
              href={`/trilha/${resolvedParams.id}`}
              className="inline-flex items-center gap-3 px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-200 hover:scale-105 active:scale-95"
            >
                <span>Entendido, Iniciar Missão</span>
                <PlayCircle size={24} fill="currentColor" className="text-violet-400/50" />
            </Link>
        </div>

      </div>
    </div>
  );
}