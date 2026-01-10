import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Play, Edit, Trash2, LayoutGrid, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteRoom } from "./actions";

export default async function LiveDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const { data: rooms } = await supabase
        .from("kahoot_rooms")
        .select("*")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/praticar">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                            <LayoutGrid className="w-8 h-8 text-purple-600" /> Meus Desafios Live
                        </h1>
                        <p className="text-muted-foreground">Gerencie suas salas e inicie partidas.</p>
                    </div>
                </div>
                <Link href="/live/create">
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20">
                        <Plus className="w-5 h-5" /> Novo Desafio
                    </Button>
                </Link>
            </div>

            {!rooms || rooms.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <LayoutGrid className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Nenhuma sala criada</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">Crie seu primeiro desafio interativo para engajar sua turma ou amigos.</p>
                    <Link href="/live/create">
                        <Button variant="outline" size="lg">Criar Agora</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <Card key={room.id} className="group flex flex-col relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-slate-200 dark:border-slate-800">
                            <div className={`absolute top-0 left-0 w-full h-1 ${room.status === 'draft' ? 'bg-slate-300' : 'bg-green-500'}`} />

                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant={room.status === 'draft' ? 'secondary' : 'default'} className="mb-2">
                                        {room.status === 'draft' ? 'Rascunho' :
                                            room.status === 'waiting' ? 'Aguardando' :
                                                room.status === 'active' ? 'Em Andamento' : 'Finalizado'}
                                    </Badge>
                                    <form action={async () => {
                                        "use server"
                                        await deleteRoom(room.id)
                                    }}>
                                        <button type="submit" className="text-muted-foreground hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-full">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                                <CardTitle className="truncate text-lg" title={room.title}>{room.title}</CardTitle>
                                <CardDescription>PIN: {room.pin_code}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs font-medium dark:bg-slate-800">
                                        <LayoutGrid className="w-3 h-3" /> {room.game_data?.length || 0} Questões
                                    </div>
                                    <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-medium dark:bg-purple-900/30 dark:text-purple-300">
                                        <Users className="w-3 h-3" /> Live
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-5 gap-2 pt-0">
                                {/* Botão de Editar disponível para Draft e Waiting */}
                                <Link href={`/live/${room.id}/edit`} className="col-span-2">
                                    <Button variant="outline" className="w-full gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-700">
                                        <Edit className="w-4 h-4" /> Editar
                                    </Button>
                                </Link>

                                {/* Botão de Jogar */}
                                <Link href={`/live/${room.id}/host?new_game=true`} className="col-span-3">
                                    <Button className={`w-full gap-2 ${room.status === 'draft' ? 'opacity-50' : 'bg-green-600 hover:bg-green-700 text-white'}`} disabled={room.status === 'draft'}>
                                        <Play className="w-4 h-4" /> {room.status === 'draft' ? 'Incompleto' : 'Jogar'}
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
