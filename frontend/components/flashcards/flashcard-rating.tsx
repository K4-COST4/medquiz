"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { motion } from "framer-motion";
import { rateFlashcard } from "@/app/actions/flashcards";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface FlashcardRatingProps {
    cardId: string;
    initialLikes: number;
    initialDislikes: number;
}

export function FlashcardRating({ cardId, initialLikes, initialDislikes }: FlashcardRatingProps) {
    const [likes, setLikes] = useState(initialLikes);
    const [dislikes, setDislikes] = useState(initialDislikes);
    const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
    const [isVoting, setIsVoting] = useState(false);

    const handleVote = async (type: 'like' | 'dislike') => {
        if (isVoting) return;
        setIsVoting(true);

        // Optimistic UI
        if (type === 'like') setLikes(prev => prev + 1);
        else setDislikes(prev => prev + 1);
        setUserVote(type);

        try {
            const res = await rateFlashcard(cardId, type);
            if (!res.success) {
                // Revert
                if (type === 'like') setLikes(prev => prev - 1);
                else setDislikes(prev => prev - 1);
                toast.error("Erro ao computar voto");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="flex items-center gap-4 mt-4">
            <Button
                variant="ghost"
                size="sm"
                className={`gap-1 hover:bg-green-50 hover:text-green-600 ${userVote === 'like' ? 'text-green-600 bg-green-50' : 'text-slate-400'}`}
                onClick={(e) => { e.stopPropagation(); handleVote('like'); }}
                disabled={isVoting || userVote !== null}
            >
                <ThumbsUp size={16} />
                <span className="text-xs font-bold">{likes}</span>
            </Button>

            <div className="h-4 w-[1px] bg-slate-200" />

            <Button
                variant="ghost"
                size="sm"
                className={`gap-1 hover:bg-rose-50 hover:text-rose-600 ${userVote === 'dislike' ? 'text-rose-600 bg-rose-50' : 'text-slate-400'}`}
                onClick={(e) => { e.stopPropagation(); handleVote('dislike'); }}
                disabled={isVoting || userVote !== null}
            >
                <ThumbsDown size={16} />
                <span className="text-xs font-bold">{dislikes}</span>
            </Button>
        </div>
    );
}
