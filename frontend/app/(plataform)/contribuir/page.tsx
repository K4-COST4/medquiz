'use client';

import React from 'react';
import { FileUp, Info, ExternalLink, ShieldCheck, UploadCloud, FileText, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ContribuirPage() {
  const googleFormUrl = "https://forms.gle/E1gTRVkXhsCGFswo7"; 

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 pb-32">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <header className="text-center md:text-left space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center md:justify-start">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
                <FileUp className="w-8 h-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">
                    Contribuição
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg mt-1">
                    Ajude a comunidade enviando provas e resumos.
                </p>
            </div>
          </div>
        </header>

        {/* Card Principal de Ação */}
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <div className="bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/10 dark:to-slate-900 p-8 md:p-12 text-center space-y-8">
                
                {/* Ícone Hero */}
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-sm">
                        <UploadCloud className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Envie sua prova ou resumo
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Para garantir a segurança dos arquivos e facilitar o envio de PDFs e imagens, 
                        utilizamos um formulário seguro do Google.
                    </p>
                </div>

                {/* Botão de Ação */}
                <Button 
                    asChild 
                    size="lg" 
                    className="h-14 px-8 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 rounded-xl"
                >
                    <a 
                        href={googleFormUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3"
                    >
                        Abrir Formulário de Envio
                        <ExternalLink size={20} />
                    </a>
                </Button>
            </div>

            {/* Rodapé do Card (Benefícios/Info) */}
            <div className="bg-slate-50 dark:bg-slate-950/50 p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <ShieldCheck className="text-emerald-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-200">Envio Seguro</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Seus dados e arquivos são protegidos pela infraestrutura do Google.</p>
                    </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <FileText className="text-indigo-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-200">Formatos Aceitos</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Aceitamos PDF, Word e Imagens (fotos legíveis de provas).</p>
                    </div>
                </div>
            </div>
        </Card>

        {/* Seção Extra: Por que contribuir? */}
        <div className="text-center pt-8 opacity-80">
            <p className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                Feito com <Heart size={14} className="text-rose-500 fill-rose-500" /> pela comunidade para a comunidade.
            </p>
        </div>

      </div>
    </div>
  );
}