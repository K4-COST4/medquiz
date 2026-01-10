import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { FormattedText } from "@/components/ui/formatted-text";

interface QuizFeedbackProps {
    isCorrect: boolean;
    commentary?: string;
    onNext: () => void;
}

export const QuizFeedback = ({ isCorrect, commentary, onNext }: QuizFeedbackProps) => {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className={`fixed bottom-0 left-0 w-full p-4 md:p-6 pb-8 border-t-2 z-30 ${isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}
            >
                <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                            {isCorrect ? <CheckCircle2 size={24} /> : <X size={24} />}
                        </div>
                        <div>
                            <h3 className={`font-black text-lg ${isCorrect ? "text-emerald-800" : "text-rose-800"}`}>
                                {isCorrect ? "Excelente!" : "Resposta Incorreta"}
                            </h3>
                            {!isCorrect && commentary && (
                                <div className="text-rose-600 text-sm font-medium mt-1 leading-relaxed max-w-lg">
                                    <FormattedText text={commentary} />
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onNext}
                        className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${isCorrect ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200" : "bg-rose-500 hover:bg-rose-600 shadow-rose-200"}`}
                    >
                        CONTINUAR
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
