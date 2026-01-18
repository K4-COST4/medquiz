import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { FormattedText } from "@/components/ui/formatted-text";
import { FillGapWidget } from "./fill-gap-widget";

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_gap' | 'open_ended';

interface QuestionCardProps {
    question: any;
    isAnswered: boolean;
    selectedOption: any;
    inputValue: string;
    showFlashcardAnswer: boolean;
    onSelectOption: (opt: any) => void;
    onInputChange: (val: string) => void;
    onRevealAnswer: () => void;
    onSelfEvaluate: (difficulty: string) => void;
    isCorrect?: boolean;
}

export const QuestionCard = ({
    question,
    isAnswered,
    selectedOption,
    inputValue,
    showFlashcardAnswer,
    onSelectOption,
    onInputChange,
    onRevealAnswer,
    onSelfEvaluate,
    isCorrect
}: QuestionCardProps) => {

    return (
        <main className="max-w-2xl mx-auto p-6 pt-8">
            <div className="mb-8">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                    <FormattedText text={question.statement} />
                </h1>
            </div>

            <div className="space-y-3">
                {/* MULTIPLE CHOICE */}
                {question.q_type === 'multiple_choice' && (
                    <div className="grid gap-3">
                        {question.content.options.map((option: any, index: number) => {
                            let btnColor = "bg-white border-slate-200 hover:bg-slate-50";
                            if (isAnswered) {
                                if (option.isCorrect) btnColor = "bg-emerald-100 border-emerald-500 text-emerald-800";
                                else if (selectedOption === option.id && !option.isCorrect) btnColor = "bg-rose-100 border-rose-500 text-rose-800";
                                else btnColor = "opacity-50 border-slate-100";
                            } else if (selectedOption === option.id) {
                                btnColor = "bg-violet-50 border-violet-500 text-violet-700 ring-2 ring-violet-200";
                            }
                            return (
                                <button key={option.id || index} disabled={isAnswered} onClick={() => onSelectOption(option.id)}
                                    className={`w-full p-4 rounded-2xl border-2 font-bold text-left transition-all ${btnColor}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black uppercase shrink-0">{option.id}</div>
                                        <FormattedText text={option.text} />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* TRUE FALSE */}
                {question.q_type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-4 h-40">
                        {(() => {
                            const isTrueCorrect = question.content.options?.find((o: any) => o.id === 'true')?.isCorrect;

                            return (
                                <>
                                    <button disabled={isAnswered} onClick={() => onSelectOption(true)}
                                        className={`rounded-2xl border-2 font-black text-lg transition-all ${isAnswered
                                            ? (isTrueCorrect ? "bg-emerald-100 border-emerald-500 text-emerald-700" // IT WAS TRUE
                                                : selectedOption === true ? "bg-rose-100 border-rose-500 text-rose-700" // WRONG GUESS
                                                    : "opacity-50 border-slate-200")
                                            : selectedOption === true
                                                ? "bg-violet-50 border-violet-500 text-violet-700"
                                                : "bg-white border-slate-200 hover:border-violet-300"
                                            }`}>VERDADEIRO</button>

                                    <button disabled={isAnswered} onClick={() => onSelectOption(false)}
                                        className={`rounded-2xl border-2 font-black text-lg transition-all ${isAnswered
                                            ? (!isTrueCorrect ? "bg-emerald-100 border-emerald-500 text-emerald-700" // IT WAS FALSE
                                                : selectedOption === false ? "bg-rose-100 border-rose-500 text-rose-700" // WRONG GUESS
                                                    : "opacity-50 border-slate-200")
                                            : selectedOption === false
                                                ? "bg-violet-50 border-violet-500 text-violet-700"
                                                : "bg-white border-slate-200 hover:border-violet-300"
                                            }`}>FALSO</button>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* FILL GAP */}
                {question.q_type === 'fill_gap' && (
                    <FillGapWidget
                        question={question}
                        isAnswered={isAnswered}
                        selectedOption={selectedOption}
                        setSelectedOption={onSelectOption}
                        inputValue={inputValue}
                        setInputValue={onInputChange}
                        isCorrect={!!isCorrect}
                    />
                )}

                {/* FLASHCARD (OPEN ENDED) */}
                {question.q_type === 'open_ended' && (
                    <div className="space-y-6">
                        {!showFlashcardAnswer ? (
                            <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-300 text-center py-20">
                                <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold mb-6">Pense na resposta e clique para revelar</p>
                                <button onClick={onRevealAnswer} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-violet-200 hover:scale-105 transition-transform">Revelar Resposta</button>
                            </div>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-xl shadow-emerald-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2 sticky top-0 bg-white pb-2 z-10">Resposta Correta</h3>
                                <div className="text-lg font-medium text-slate-800 mb-6">
                                    <FormattedText text={question.content.answer} />
                                </div>
                                <div className="grid grid-cols-3 gap-3 sticky bottom-0 bg-white pt-2 z-10 border-t border-slate-50">
                                    <button onClick={() => onSelfEvaluate('hard')} className="p-3 bg-rose-100 text-rose-700 font-bold rounded-xl text-sm hover:bg-rose-200">Errei</button>
                                    <button onClick={() => onSelfEvaluate('medium')} className="p-3 bg-amber-100 text-amber-700 font-bold rounded-xl text-sm hover:bg-amber-200">Difícil</button>
                                    <button onClick={() => onSelfEvaluate('easy')} className="p-3 bg-emerald-100 text-emerald-700 font-bold rounded-xl text-sm hover:bg-emerald-200">Fácil</button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
};
