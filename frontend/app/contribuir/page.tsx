import React from 'react';
import { FileUp, Info } from 'lucide-react'; // Ícones para dar contexto

export default function ContribuirPage() {
  // Substitua pelo link real do seu Google Form
  const googleFormUrl = "https://forms.gle/saaCorEN2Hf2GWat9?embedded=true"; 

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Cabeçalho da Página */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <FileUp className="w-8 h-8 text-[#0cb7f2]" />
            Contribuição Comunitária
          </h1>
          <p className="text-slate-500 mt-2">
            Ajude a treinar a nossa IA. Envie provas antigas e receba XP bônus (em breve).
          </p>
        </header>

        {/* Card de Aviso (Consentimento Informado) */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 items-start text-sm text-blue-800">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            Os arquivos enviados serão analisados pela nossa IA para gerar novas questões inéditas. 
            Certifique-se de que o arquivo está legível (PDF ou Foto nítida).
          </p>
        </div>

        {/* O Iframe do Formulário */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-[800px] w-full">
          <iframe 
            src={googleFormUrl} 
            width="640" 
            height="800" 
            frameBorder="0" 
            marginHeight={0} 
            marginWidth={0}
            className="w-full h-full"
          >
            A carregar...
          </iframe>
        </div>

      </div>
    </div>
  );
}