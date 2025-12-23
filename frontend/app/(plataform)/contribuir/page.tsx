import React from 'react';
import { FileUp, Info, ExternalLink, ShieldCheck, UploadCloud } from 'lucide-react';

export default function ContribuirPage() {
  // COLOQUE SEU LINK AQUI (Não precisa do ?embedded=true mais)
  const googleFormUrl = "https://forms.gle/E1gTRVkXhsCGFswo7"; 

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-12 pb-32">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <header className="text-center md:text-left space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center justify-center md:justify-start gap-3">
            <div className="bg-[#0cb7f2] p-3 rounded-2xl shadow-lg shadow-blue-200">
                <FileUp className="w-8 h-8 text-white" />
            </div>
            Contribuição
          </h1>
          <p className="text-slate-500 text-lg">
            Ajude a treinar a nossa IA enviando provas antigas.
          </p>
        </header>

        {/* Card Principal de Ação */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden relative">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-8 md:p-12 text-center space-y-6">
                
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                    <UploadCloud className="w-12 h-12 text-[#0cb7f2]" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">
                        Envie sua prova ou resumo
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Devido à segurança do Google para envio de arquivos, 
                        o formulário deve ser aberto em uma janela segura separada.
                    </p>
                </div>

                {/* O Botão que resolve o problema */}
                <a 
                    href={googleFormUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-[#0cb7f2] hover:brightness-110 text-white text-lg font-bold py-4 px-10 rounded-2xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1"
                >
                    Abrir Formulário de Envio
                    <ExternalLink size={20} />
                </a>
            </div>

            {/* Rodapé do Card (Benefícios/Info) */}
            <div className="bg-slate-50 p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <ShieldCheck className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                    <span>Seus dados e arquivos estão protegidos pelo Google.</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <Info className="text-blue-400 w-5 h-5 flex-shrink-0" />
                    <span>Aceitamos PDF e Imagens legíveis.</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}