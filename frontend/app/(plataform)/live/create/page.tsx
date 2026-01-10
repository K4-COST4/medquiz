"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, ArrowRight, Sparkles, Zap, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createBasicRoom } from "../actions";

interface SimpleCreateForm {
    title: string;
    topic: string;
}

export default function CreateSimpleRoomPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<SimpleCreateForm>();

    const onSubmit = async (data: SimpleCreateForm) => {
        setIsLoading(true);
        const result = await createBasicRoom(data.title, data.topic);

        if (result?.success) {
            router.push(`/live/${result.roomId}/edit`);
        } else {
            alert("Erro: " + result?.error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">

            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-64 h-64 bg-purple-900 opacity-20 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm relative z-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>

                <CardHeader className="text-center pt-10 pb-2">
                    <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                        <Zap className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 pb-1">
                        Criar Nova Sala
                    </CardTitle>
                    <CardDescription className="text-base">
                        Prepare o palco para o aprendizado.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-300 font-medium ml-1">Título da Sala</Label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-purple-500"
                                    placeholder="Ex: Super Quiz de Anatomia"
                                    {...register("title", { required: true })}
                                />
                            </div>
                            {errors.title && <span className="text-red-500 text-xs ml-1">Por favor, dê um título.</span>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-300 font-medium ml-1">Tópico Principal</Label>
                            <div className="relative">
                                <Sparkles className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-purple-500"
                                    placeholder="Ex: Medicina Interna"
                                    {...register("topic", { required: true })}
                                />
                            </div>
                            {errors.topic && <span className="text-red-500 text-xs ml-1">Informe o tópico para a IA.</span>}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <>Começar <ArrowRight className="w-5 h-5 ml-2" /></>}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
