import { motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuizHeaderProps {
    currentQIndex: number;
    totalQuestions: number;
    difficulty: 'easy' | 'medium' | 'hard';
    lives: number;
    onExit: () => void;
}

export const QuizHeader = ({ currentQIndex, totalQuestions, difficulty, lives, onExit }: QuizHeaderProps) => {
    return (
        <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <X className="text-slate-300 cursor-pointer hover:text-slate-500" onClick={onExit} />

                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-violet-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQIndex) / totalQuestions) * 100}%` }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase
                    ${difficulty === 'easy' ? 'bg-emerald-100 text-emerald-600' :
                            difficulty === 'medium' ? 'bg-amber-100 text-amber-600' :
                                'bg-rose-100 text-rose-600'}
                `}>
                        {difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Médio' : 'Difícil'}
                    </div>
                    <div className="flex items-center gap-1 text-rose-500 font-black ml-2">
                        <Heart fill="currentColor" size={20} />
                        <span>{lives}</span>
                    </div>
                </div>
            </div>
        </header>
    );
};
