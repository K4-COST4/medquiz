"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, CheckCircle, XCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface Room {
    id: string;
    status: 'draft' | 'waiting' | 'active' | 'question_ended' | 'leaderboard' | 'finished';
    current_question_index: number;
    game_data: any[];
    question_start_at?: string;
}

interface RoundResult {
    is_correct: boolean;
    points_earned: number;
    score: number;
    streak: number;
}

export default function PlayerGamePage({ params }: { params: Promise<{ pin_code: string }> }) {
    const { pin_code } = use(params);
    const router = useRouter();
    const supabase = createClient();

    // State
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [nickname, setNickname] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
    const [score, setScore] = useState(0);

    // 1. Auth & Init
    useEffect(() => {
        const storedId = localStorage.getItem("kahoot_player_id");
        const storedName = localStorage.getItem("kahoot_nickname");

        if (!storedId || !storedName) {
            router.replace("/play");
            return;
        }

        setPlayerId(storedId);
        setNickname(storedName);

        // Fetch Room ID by PIN
        const fetchRoom = async () => {
            const { data, error } = await supabase
                .from("kahoot_rooms")
                .select("*")
                .eq("pin_code", pin_code)
                .single();

            if (error || !data) {
                alert("Sala não encontrada!");
                router.replace("/play");
                return;
            }

            setRoomId(data.id);
            setRoom(data);
        };
        fetchRoom();
    }, [pin_code, router]);

    // 2. Realtime Sync
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`player_room_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kahoot_rooms', filter: `id=eq.${roomId}` }, (payload) => {
                setRoom((prev) => {
                    const newRoom = payload.new as Room;
                    // Reset local state on state change
                    if (prev?.status !== newRoom.status || prev?.current_question_index !== newRoom.current_question_index) {
                        if (newRoom.status === 'active') {
                            setHasAnswered(false);
                            setRoundResult(null);
                        }
                    }
                    return newRoom;
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);


    const handleSubmit = async (key: string) => {
        // Bloqueio de segurança
        if (hasAnswered || !playerId || !roomId || !room) return;

        // Feedback Tátil
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(200);
        }

        setHasAnswered(true);

        // --- CÁLCULO DE PONTOS BLINDADO ---
        let timeRemaining = 30; // Fallback padrão

        if (room.question_start_at) {
            const startTime = new Date(room.question_start_at).getTime();
            const now = Date.now();
            const elapsedSec = (now - startTime) / 1000;

            // CORREÇÃO AQUI: Garante que game_data é um array antes de acessar
            const questions = room.game_data || [];
            const currentQ = questions[room.current_question_index];

            // Se a questão existir, usa o tempo dela. Se não, usa 30s.
            const limit = currentQ?.time_limit || 30;

            timeRemaining = Math.max(0, Math.round(limit - elapsedSec));
        }
        // -----------------------------------------

        // RPC Call
        const { data, error } = await supabase.rpc('submit_kahoot_answer', {
            p_player_id: playerId,
            p_room_id: roomId,
            p_answer_key: key,
            p_time_remaining: timeRemaining
        });

        if (error) {
            console.error(error);
            // Opcional: mostrar erro, mas não travar a tela
            // alert("Erro ao enviar resposta."); 
            setHasAnswered(false);
        } else {
            setRoundResult(data as RoundResult);
            // setScore é opcional se você tiver esse estado local
            // setScore((data as RoundResult).score); 
            if ((data as RoundResult).is_correct) {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
        }
    };


    if (!room || !nickname) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="animate-spin w-12 h-12" /></div>;

    // WAITING / LOBBY
    if (room.status === 'waiting') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
                <div className="mb-8 p-4 rounded-full bg-slate-800 border-4 border-green-500 animate-bounce">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Você está dentro!</h1>
                <p className="text-xl text-slate-400 font-mono mb-12">{nickname}</p>
                <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm uppercase tracking-widest">Aguardando Host...</span>
                </div>
                <div className="fixed bottom-8 text-center text-slate-600 text-sm">
                    Olhe para o telão
                </div>
            </div>
        );
    }

    // ACTIVE (Playing)
    if (room.status === 'active') {
        if (hasAnswered) {
            return (
                <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-6">
                    <div className="p-8 rounded-full bg-slate-800 animate-pulse">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold">Resposta Enviada!</h2>
                    <p className="text-slate-400">Aguarde o tempo acabar...</p>
                </div>
            )
        }

        const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
        const shapes = ['▲', '◆', '●', '■'];
        const keys = ['a', 'b', 'c', 'd'];

        return (
            <div className="h-screen grid grid-cols-2 grid-rows-2 p-4 gap-4 bg-slate-900">
                {keys.map((k, idx) => (
                    <button
                        key={k}
                        onClick={() => handleSubmit(k)}
                        className={cn(
                            "flex items-center justify-center rounded-lg shadow-xl active:scale-95 transition-transform",
                            colors[idx]
                        )}
                    >
                        <span className="text-6xl md:text-8xl text-white drop-shadow-md">{shapes[idx]}</span>
                    </button>
                ))}
            </div>
        );
    }

    // QUESTION ENDED (Feedback)
    if (room.status === 'question_ended') {
        const isCorrect = roundResult?.is_correct;
        const bgColor = isCorrect ? 'bg-green-600' : 'bg-red-600';

        return (
            <div className={cn("h-screen flex flex-col items-center justify-center text-white p-6 animate-in fade-in zoom-in duration-300", bgColor)}>
                {isCorrect ? (
                    <>
                        <CheckCircle className="w-32 h-32 mb-6" />
                        <h1 className="text-4xl font-black mb-2">Correto!</h1>
                        <p className="text-2xl font-bold mb-8">+{roundResult?.points_earned} pts</p>
                        <div className="p-4 bg-black/20 rounded-lg">
                            <span className="text-sm uppercase tracking-widest opacity-75">Streak</span>
                            <div className="text-3xl font-mono text-center">🔥 {roundResult?.streak}</div>
                        </div>
                    </>
                ) : (
                    <>
                        <XCircle className="w-32 h-32 mb-6" />
                        <h1 className="text-4xl font-black mb-2">Errado...</h1>
                        <p className="text-lg opacity-90 max-w-xs text-center mb-8">Não desanime, a próxima é sua!</p>
                    </>
                )}

                <div className="fixed bottom-0 w-full p-6 bg-black/20 backdrop-blur-sm flex justify-between items-center">
                    <span className="font-bold">{nickname}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full font-mono">{score || roundResult?.score} pts</span>
                </div>
            </div>
        );
    }

    // LEADERBOARD OR FINISHED
    if (room.status === 'leaderboard' || room.status === 'finished') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-purple-900 text-white p-6">
                <Trophy className="w-24 h-24 text-yellow-400 mb-6 animate-bounce" />
                <h2 className="text-2xl font-bold mb-4 text-center">Olhe para o telão!</h2>
                <p className="text-purple-300 mb-12">Veja o ranking completo</p>

                <div className="p-6 bg-white/10 rounded-xl w-full max-w-sm flex justify-between items-center">
                    <span className="text-lg">Sua pontuação:</span>
                    <span className="text-3xl font-black text-yellow-400">{score}</span>
                </div>
            </div>
        )
    }

    return null;
}
