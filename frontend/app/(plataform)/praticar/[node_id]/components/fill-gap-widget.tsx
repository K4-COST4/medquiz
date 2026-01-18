import React, { useMemo } from 'react';
import { FormattedText } from '@/components/ui/formatted-text';

// Função auxiliar para embaralhar (pode ser movida para utils se necessário, mas ok aqui por enquanto)
function shuffleArray(array: any[]) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

interface FillGapWidgetProps {
    question: any;
    isAnswered: boolean;
    selectedOption: any;
    setSelectedOption: (opt: any) => void;
    inputValue: string;
    setInputValue: (val: string) => void;
    isCorrect: boolean;
}

export const FillGapWidget = ({ question, isAnswered, selectedOption, setSelectedOption, inputValue, setInputValue, isCorrect }: FillGapWidgetProps) => {
    const content = question.content;
    const hasOptions = content.options && content.options.length > 0;

    // Memoriza a ordem embaralhada para não pular quando clicar
    const shuffledOptions = useMemo(() => {
        if (hasOptions) {
            // Normalize options: AI might return objects {id, text} due to strict prompt
            const safeOptions = content.options.map((opt: any) => {
                if (typeof opt === 'object' && opt !== null) {
                    return opt.text || opt.id || "";
                }
                return opt;
            });
            return shuffleArray(safeOptions);
        }
        return [];
    }, [question.id, hasOptions, content.options]); // Só reembaralha se mudar de questão

    // CASO 1: Questão Antiga (Input de Texto)
    if (!hasOptions) {
        return (
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 text-lg font-medium leading-relaxed">
                <FormattedText text={content.text_start} />
                <input
                    type="text"
                    disabled={isAnswered}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="..."
                    className={`mx-2 border-b-2 outline-none px-1 text-center font-bold min-w-[100px] w-auto inline-block ${isAnswered ? (isCorrect ? "border-emerald-500 text-emerald-600" : "border-rose-500 text-rose-600") : "border-slate-300 focus:border-violet-500 focus:bg-violet-50"
                        }`}
                />
                <FormattedText text={content.text_end} />
                {isAnswered && !isCorrect && <div className="mt-4 text-sm font-bold text-emerald-600">Resposta: {content.correct_answer}</div>}
            </div>
        );
    }

    // CASO 2: Questão Nova (Botões estilo Duolingo)
    return (
        <div className="flex flex-col gap-6">
            {/* Frase com destaque visual no buraco */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 text-lg md:text-xl font-medium leading-relaxed text-center shadow-sm">
                <FormattedText text={content.text_start} />
                <span className={`inline-block mx-2 px-3 py-1 border-b-4 rounded-t min-w-[100px] font-bold transition-colors ${isAnswered
                    ? (isCorrect ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-rose-500 text-rose-700 bg-rose-50")
                    : (selectedOption ? "border-violet-500 text-violet-700 bg-violet-50" : "border-slate-300 bg-slate-50 text-slate-400")
                    }`}>
                    {/* Mostra o que o usuário clicou, ou a resposta certa se já acabou, ou sublinhado vazio */}
                    {isAnswered ? (selectedOption || content.correct_answer) : (selectedOption || "_____")}
                </span>
                <FormattedText text={content.text_end} />
            </div>

            {/* Grid de Opções */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shuffledOptions.map((opt: string, idx: number) => {
                    const isSelected = selectedOption === opt;
                    const isTheCorrectOne = opt === content.correct_answer;

                    let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-slate-50"; // Padrão

                    if (isAnswered) {
                        if (isTheCorrectOne) btnStyle = "bg-emerald-100 border-emerald-500 text-emerald-800"; // Gabarito
                        else if (isSelected && !isTheCorrectOne) btnStyle = "bg-rose-100 border-rose-500 text-rose-800 opacity-60"; // Erro
                        else btnStyle = "opacity-40 border-slate-100"; // Resto
                    } else if (isSelected) {
                        btnStyle = "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200 scale-[1.02]"; // Selecionado
                    }

                    return (
                        <button
                            key={idx}
                            disabled={isAnswered}
                            onClick={() => setSelectedOption(opt)}
                            className={`p-4 rounded-xl border-2 font-bold text-lg transition-all active:scale-95 ${btnStyle}`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
