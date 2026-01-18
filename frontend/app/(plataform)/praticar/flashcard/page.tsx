'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Plus,
    Search,
    Library,
    Lock,
    Globe,
    MoreVertical,
    Play,
    RotateCw,

    Trash2,
    Folder,
    Wand2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createDeck, getMyDecks, deleteDeck, type Deck } from "@/app/actions/flashcards"
import { getUsageQuotas } from "@/app/actions/medai-core"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function FlashcardsDashboard() {
    const router = useRouter()
    const [decks, setDecks] = useState<Deck[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Novo Deck State
    const [isNewDeckOpen, setIsNewDeckOpen] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newDesc, setNewDesc] = useState("")
    const [newIsPublic, setNewIsPublic] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [deckToDelete, setDeckToDelete] = useState<string | null>(null)
    const [flashQuota, setFlashQuota] = useState<{ remaining: number } | null>(null);

    useEffect(() => {
        loadDecks()
        getUsageQuotas().then(q => {
            if (q) setFlashQuota(q.flashcard);
        });
    }, [])

    const loadDecks = async () => {
        try {
            const data = await getMyDecks()
            setDecks(data)
        } catch (error) {
            toast.error("Erro ao carregar baralhos")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateDeck = async () => {
        if (!newTitle.trim()) {
            toast.error("O título é obrigatório")
            return
        }

        setIsCreating(true)
        try {
            const res = await createDeck(newTitle, newDesc, newIsPublic)
            if (res.success) {
                toast.success("Baralho criado com sucesso!")
                setIsNewDeckOpen(false)
                setNewTitle("")
                setNewDesc("")
                setNewIsPublic(false)
                loadDecks()
            } else {
                toast.error("Erro ao criar baralho: " + res.error)
            }
        } catch (error) {
            toast.error("Erro inesperado")
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteDeck = async () => {
        if (!deckToDelete) return
        try {
            const res = await deleteDeck(deckToDelete)
            if (res.success) {
                toast.success("Baralho excluído")
                setDecks(prev => prev.filter(d => d.id !== deckToDelete))
            } else {
                toast.error(res.error || "Erro ao excluir")
            }
        } catch (error) {
            toast.error("Erro ao excluir")
        } finally {
            setDeckToDelete(null)
        }
    }

    const filteredDecks = decks.filter(deck =>
        deck.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deck.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Library className="text-indigo-500" /> Meus Flashcards
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gerencie seus baralhos e pratique Repetição Espaçada.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {flashQuota && (
                        <div className={cn(
                            "text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5",
                            flashQuota.remaining > 0
                                ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                : "bg-orange-50 text-orange-700 border-orange-100"
                        )}>
                            <Wand2 size={12} />
                            {flashQuota.remaining > 0 ? "Criação c/ IA disponível" : "Limite IA atingido hoje"}
                        </div>
                    )}
                    <Button
                        onClick={() => router.push('/praticar/flashcard/novo')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105"
                    >
                        <Plus size={18} className="mr-2" /> Novo Baralho
                    </Button>
                </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                    placeholder="Buscar nos meus baralhos..."
                    className="pl-10 h-12 bg-white dark:bg-slate-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* FILTERED LISTS */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : filteredDecks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
                        <Library className="h-10 w-10 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Sua biblioteca está vazia</h3>
                    <p className="text-slate-500 mb-8 text-center max-w-sm">
                        Crie baralhos ou use as trilhas para gerar estudos.
                    </p>
                    <Button onClick={() => router.push('/praticar/flashcard/novo')} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Baralho
                    </Button>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* 1. POR MÓDULO (Decks de Trilha) */}
                    {filteredDecks.some(d => d.module_id) && (
                        <section>
                            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <Folder size={18} className="text-violet-500" /> Por Módulo/Trilha
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {filteredDecks.filter(d => d.module_id).map(deck => (
                                    <DeckCard key={deck.id} deck={deck} router={router} onDelete={() => setDeckToDelete(deck.id)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 2. POR AULA (Decks de Lição) */}
                    {filteredDecks.some(d => d.lesson_id) && (
                        <section>
                            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <Play size={18} className="text-emerald-500" /> Por Aula
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {filteredDecks.filter(d => d.lesson_id).map(deck => (
                                    <DeckCard key={deck.id} deck={deck} router={router} onDelete={() => setDeckToDelete(deck.id)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 3. MEUS BARALHOS (Soltos) */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                            <Library size={18} className="text-indigo-500" /> Meus Baralhos
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {/* "New Deck" Card always here */}
                            <Card
                                className="group border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer flex flex-col items-center justify-center p-6 text-center transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 min-h-[220px]"
                                onClick={() => router.push('/praticar/flashcard/novo')}
                            >
                                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Plus className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={24} />
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">Criar Novo Baralho</h3>
                            </Card>

                            {filteredDecks.filter(d => !d.lesson_id && !d.module_id).map(deck => (
                                <DeckCard key={deck.id} deck={deck} router={router} onDelete={() => setDeckToDelete(deck.id)} />
                            ))}
                        </div>
                    </section>
                </div>
            )}

            <AlertDialog open={!!deckToDelete} onOpenChange={(open: boolean) => !open && setDeckToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o baralho e todos os seus cards.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDeck} className="bg-red-600 hover:bg-red-700">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )

}

function DeckCard({ deck, router, onDelete }: { deck: Deck, router: any, onDelete: () => void }) {
    return (
        <Card
            className="group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            onClick={() => router.push(`/praticar/flashcard/${deck.id}`)}
        >
            <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${deck.module_id ? "bg-violet-500" : deck.lesson_id ? "bg-emerald-500" : "bg-indigo-500"}`} />
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant="secondary" className={`mb-2 ${deck.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {deck.is_public ? <Globe size={12} className="mr-1" /> : <Lock size={12} className="mr-1" />}
                        {deck.is_public ? "Público" : "Privado"}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 z-10"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
                <CardTitle className="text-xl line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {deck.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {deck.description || "Sem descrição."}
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <RotateCw size={14} className="text-indigo-500" />
                        <span>{deck.card_count || 0} cards</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-2">
                <Button className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-slate-800 group-hover:border-indigo-200 transition-all">
                    <Play size={16} className="mr-2 fill-current" /> Estudar
                </Button>
            </CardFooter>
        </Card>
    );
}
