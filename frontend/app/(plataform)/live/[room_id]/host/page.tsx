"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Users, Play, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
// Imports updated
import { startQuestion, endQuestion, showLeaderboard, resetRoomState } from "../../actions";

interface Player {
    id: string;
    nickname: string;
    score: number;
    streak: number;
    last_answer?: string; // Armazena a resposta 'a', 'b', 'c', 'd'
    is_online?: boolean; // Adicionado para evitar erro de ts
}

interface Room {
    id: string;
    pin_code: string;
    status: 'draft' | 'waiting' | 'active' | 'question_ended' | 'leaderboard' | 'finished';
    current_question_index: number;
    game_data: any[];
}

export default function HostGamePage({ params }: { params: Promise<{ room_id: string }> }) {
    const { room_id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isResetting, setIsResetting] = useState(true);
    const supabase = createClient();

    // 1. Init & Realtime
    // 1. Init & Realtime
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        let channel: any;

        const initSequence = async () => {
            setIsInitializing(true);

            // PASSO A: Lock & Reset
            await resetRoomState(room_id);
            setPlayers([]); // PASSO B: Limpa estado local forçadamente

            // PASSO C: Fetch & Realtime
            const { data } = await supabase.from("kahoot_rooms").select("*").eq("id", room_id).single();
            if (data) setRoom(data);

            const fetchPlayers = async () => {
                const { data } = await supabase.from("kahoot_players").select("*").eq("room_id", room_id);
                if (data) setPlayers(data.map(p => ({ ...p, is_online: false })));
            };
            await fetchPlayers();

            channel = supabase
                .channel(`game_room_${room_id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kahoot_players', filter: `room_id=eq.${room_id}` }, (payload) => {
                    setPlayers((prev) => [...prev, { ...payload.new as Player, is_online: false }]);
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kahoot_players', filter: `room_id=eq.${room_id}` }, (payload) => {
                    setPlayers(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kahoot_rooms', filter: `id=eq.${room_id}` }, (payload) => {
                    setRoom(payload.new as Room);
                })
                .on('presence', { event: 'sync' }, () => {
                    const newState = channel.presenceState();
                    const onlineIds = new Set();
                    Object.values(newState).forEach((presences: any) => {
                        presences.forEach((p: any) => {
                            if (p.player_id) onlineIds.add(p.player_id);
                        });
                    });
                    setPlayers(prev => prev.map(p => ({ ...p, is_online: onlineIds.has(p.id) })));
                })
                .subscribe();

            // PASSO D: Unlock UI
            setIsInitializing(false);
            setIsResetting(false);
        };

        if (room_id) {
            initSequence();
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [room_id]);

    // 2. Timer Logic (Authoritative)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (room?.status === 'active' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((t) => t - 1);
            }, 1000);
        } else if (timeLeft === 0 && room?.status === 'active') {
            // TIME'S UP -> Trigger End Question
            endQuestion(room_id);
        }
        return () => clearInterval(interval);
    }, [timeLeft, room?.status, room_id]);

    // Reset timer when question changes
    useEffect(() => {
        if (room?.status === 'active') {
            // CORREÇÃO: Adicionamos (room.game_data || []) para garantir que é um array
            const questions = room.game_data || [];
            const currentQ = questions[room.current_question_index];

            // Só define o tempo se a questão existir
            const limit = currentQ?.time_limit || 30;
            setTimeLeft(limit);
        }
    }, [room?.current_question_index, room?.status, room?.game_data]);


    // 3. Navigation Actions
    const handleNext = async () => {
        if (!room) return;

        if (room.status === 'active') {
            await endQuestion(room_id);
        } else if (room.status === 'question_ended') {
            await showLeaderboard(room_id);
        } else if (room.status === 'leaderboard') {
            const nextIndex = room.current_question_index + 1;
            if (nextIndex >= room.game_data.length) {
                await supabase.from("kahoot_rooms").update({ status: 'finished' }).eq("id", room_id);
                confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
            } else {
                await startQuestion(room_id, nextIndex);
            }
        }
    };

    // 4. Renders
    if (isResetting || !room) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xl animate-pulse">Carregando...</p>
            </div>
        );
    }

    // LOBBY
    if (room.status === 'waiting') {
        return (
            <div className="h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-light mb-2">Entre em <span className="font-bold text-blue-400">medquiz.com/play</span></h2>
                    <div className="bg-white text-slate-900 rounded-xl px-12 py-6 text-8xl font-black tracking-widest shadow-2xl">
                        {room.pin_code}
                    </div>
                </div>
                <div className="w-full max-w-4xl grid grid-cols-4 gap-4 mb-12">
                    {players.map(p => (
                        <div key={p.id} className={`p-3 rounded-lg text-center font-bold animate-in fade-in zoom-in duration-300 transition-all ${p.is_online
                            ? 'bg-slate-800 border-2 border-green-500 text-white scan-pulse'
                            : 'bg-slate-800/50 text-slate-500 border-2 border-transparent'
                            }`}>
                            {p.nickname}
                        </div>
                    ))}
                    {players.length === 0 && <p className="col-span-4 text-center text-slate-500">Aguardando jogadores...</p>}
                </div>
                <div className="flex items-center gap-4 text-xl">
                    <Users className="w-6 h-6" /> {players.length} Jogadores
                </div>
                <Button
                    size="lg"
                    className="mt-8 text-2xl px-12 py-8 bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform hover:scale-105"
                    onClick={() => startQuestion(room_id, 0)}
                    disabled={players.length === 0}
                >
                    INICIAR
                </Button>
            </div>
        );
    }

    // FINISHED
    if (room.status === 'finished') {
        const top3 = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
        return (
            <div className="h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
                <Trophy className="w-32 h-32 text-yellow-500 mb-6 animate-bounce" />
                <h1 className="text-6xl font-black mb-8">Podium Final</h1>
                <div className="flex gap-4 items-end mb-12">
                    {top3[1] && <div className="bg-slate-700 p-4 rounded-t-lg h-32 flex flex-col items-center justify-end w-32"><span className="text-xl font-bold">{top3[1].nickname}</span><span className="text-slate-400">{top3[1].score}pts</span><div className="text-4xl font-black text-slate-500">2</div></div>}
                    {top3[0] && <div className="bg-yellow-500 text-slate-900 p-4 rounded-t-lg h-48 flex flex-col items-center justify-end w-40 shadow-xl z-10"><span className="text-2xl font-black">{top3[0].nickname}</span><span className="font-bold">{top3[0].score}pts</span><div className="text-6xl font-black">1</div></div>}
                    {top3[2] && <div className="bg-slate-700 p-4 rounded-t-lg h-24 flex flex-col items-center justify-end w-32"><span className="text-xl font-bold">{top3[2].nickname}</span><span className="text-slate-400">{top3[2].score}pts</span><div className="text-4xl font-black text-slate-500">3</div></div>}

                </div>
                <Button onClick={() => router.push('/live')} size="lg">Sair</Button>
            </div>
        );
    }

    // LEADERBOARD (Or Finished if last)
    if (room.status === 'leaderboard') {
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, 5);
        return (
            <div className="h-screen flex flex-col bg-slate-900 text-white p-8">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl font-bold">Ranking</h1>
                    {/* Next Button Logic */}
                    <Button onClick={handleNext} size="lg" className="text-xl px-8">
                        {room.current_question_index + 1 >= room.game_data.length ? "Finalizar Jogo" : "Próxima Pergunta"}
                    </Button>
                </div>

                <div className="max-w-4xl mx-auto w-full flex flex-col gap-4">
                    {sortedPlayers.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between bg-slate-800 p-6 rounded-xl shadow-lg animate-in slide-in-from-right duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex items-center gap-6">
                                <div className="text-3xl font-black w-12 text-slate-500">#{idx + 1}</div>
                                <div className="text-2xl font-bold">{p.nickname}</div>
                                {p.streak > 2 && <div className="bg-orange-500 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">🔥 Streak {p.streak}</div>}
                            </div>
                            <div className="text-3xl font-mono text-green-400">{p.score}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ACTIVE OR QUESTION_ENDED
    const questions = room.game_data || [];
    const currentQuestion = questions[room.current_question_index];

    // Se por algum motivo não tiver questão, mostra erro amigável
    if (!currentQuestion) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
                <div className="text-xl text-red-500 font-bold mb-4">Erro de Sincronização</div>
                <p>A questão {room.current_question_index + 1} não foi encontrada.</p>
                <Button onClick={() => router.push('/live')} className="mt-4" variant="secondary">
                    Voltar ao Dashboard
                </Button>
            </div>
        );
    }

    // Variáveis visuais necessárias
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
    const shapes = ['▲', '◆', '●', '■'];

    // Calcular estatísticas para o gráfico
    const votes = {
        a: players.filter(p => p.last_answer === 'a').length,
        b: players.filter(p => p.last_answer === 'b').length,
        c: players.filter(p => p.last_answer === 'c').length,
        d: players.filter(p => p.last_answer === 'd').length
    };
    const totalVotes = players.length || 1;
    const maxVotes = Math.max(votes.a, votes.b, votes.c, votes.d, 1);

    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white">
            <div className="flex justify-between items-center p-6 bg-slate-800 shadow-md">
                <div className="text-xl font-bold">{room.current_question_index + 1} / {room.game_data.length}</div>
                {room.status === 'active' ? (
                    <div className="flex items-center gap-2 text-2xl font-mono bg-slate-700 px-4 py-2 rounded-lg">
                        <Clock className="w-6 h-6" /> {timeLeft}s
                    </div>
                ) : (
                    <div className="text-xl font-bold text-yellow-500 uppercase tracking-widest">Tempo Esgotado</div>
                )}

                <Button onClick={handleNext} variant={room.status === 'active' ? "destructive" : "default"} size="lg">
                    {room.status === 'active' ? "Encerrar Agora" : "Ver Ranking"}
                </Button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-8">
                {/* Gráfico de Barras */}
                {room.status === 'question_ended' && (
                    <div className="flex justify-center items-end gap-8 h-32 w-full max-w-2xl animate-in fade-in slide-in-from-bottom duration-500">
                        {['a', 'b', 'c', 'd'].map((opt, idx) => {
                            const count = (votes as any)[opt];
                            const percentage = Math.round((count / totalVotes) * 100);
                            const height = Math.max((count / maxVotes) * 100, 10); // Min 10% height

                            return (
                                <div key={opt} className="flex flex-col items-center justify-end h-full flex-1 gap-2">
                                    <span className="font-bold text-lg shadow-sm">{count}</span>
                                    <div
                                        className={cn("w-full rounded-t-sm transition-all duration-700 ease-out", colors[idx])}
                                        style={{ height: `${height}%` }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}

                <h1 className="text-4xl md:text-5xl font-bold leading-tight max-w-5xl">
                    {currentQuestion.statement}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl h-[40vh]">
                    {currentQuestion.options?.map((opt: any, idx: number) => {
                        const isEnded = room.status === 'question_ended';
                        // Simplificação: Assumindo que opt.isCorrect existe. Se não, precisaremos ajustar.
                        const isCorrect = opt.isCorrect || opt.is_correct || false;

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "flex items-center p-6 rounded-lg text-2xl font-bold shadow-lg transition-all",
                                    colors[idx % 4],
                                    isEnded && !isCorrect && "opacity-20 grayscale",
                                    isEnded && isCorrect && "ring-8 ring-green-400 scale-105"
                                )}
                            >
                                <span className="mr-4 text-4xl opacity-50">{shapes[idx % 4]}</span>
                                {opt.text}
                                {isEnded && isCorrect && <span className="ml-auto text-4xl">✅</span>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
