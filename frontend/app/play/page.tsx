"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinRoom } from "../(plataform)/live/actions";

export default function PlayerJoinPage() {
    const router = useRouter();
    const [pin, setPin] = useState("");
    const [nickname, setNickname] = useState("");
    const [step, setStep] = useState<'pin' | 'nick'>('pin');
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState("");

    useEffect(() => {
        // Gerar ou recuperar Device ID único
        let storedId = localStorage.getItem("medquiz_device_id");
        if (!storedId) {
            storedId = crypto.randomUUID();
            localStorage.setItem("medquiz_device_id", storedId);
        }
        setDeviceId(storedId);
    }, []);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validação básica do PIN antes de prosseguir
        if (pin.length < 6) {
            alert("O PIN deve ter 6 números.");
            return;
        }
        setStep('nick');
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Chama a Server Action que faz toda a validação de Status e Device Binding
        const result = await joinRoom(pin, nickname, deviceId);

        if (result.error) {
            alert(result.error);
            setLoading(false);
            if (result.error.includes("não encontrada")) {
                setStep('pin');
            }
            return;
        }

        if (result.success && result.playerId) {
            // Salva sessão localmente - OBRIGATÓRIO salvar antes de navegar
            localStorage.setItem("kahoot_player_id", result.playerId);
            localStorage.setItem("kahoot_room_id", result.roomId);
            localStorage.setItem("kahoot_nickname", nickname); // Faltava salvar o nickname

            // Pequeno delay para garantir que o storage persistiu (hack comum em mobile/webview)
            await new Promise(resolve => setTimeout(resolve, 100));

            router.push(`/play/${pin}`);
        }
    };

    return (
        <div className="h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden p-8">
                <h1 className="text-3xl font-black text-center text-slate-900 mb-8 tracking-tighter uppercase">
                    MedQuiz Live
                </h1>

                {step === 'pin' ? (
                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        <Input
                            placeholder="PIN do Jogo"
                            className="text-center text-2xl font-mono py-6 tracking-widest uppercase"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            maxLength={6}
                        />
                        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading || pin.length < 6}>
                            {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleJoin} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div className="text-center text-sm text-muted-foreground mb-4">Entrando na sala: <span className="font-bold text-slate-900">{pin}</span></div>
                        <Input
                            placeholder="Seu Apelido"
                            className="text-center text-xl py-6 font-bold"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            maxLength={15}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setStep('pin')} disabled={loading}>
                                Voltar
                            </Button>
                            <Button type="submit" className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" disabled={loading || !nickname}>
                                {loading ? <Loader2 className="animate-spin" /> : "Pronto, vamos lá!"}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
