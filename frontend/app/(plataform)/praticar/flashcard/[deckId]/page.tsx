'use client'

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    ChevronLeft,
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Sparkles,
    Brain,
    Check,
    X,
    MessageCircle,
    MoreVertical,
    Trash2,
    Edit,
    Plus,
    Save
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import Markdown from "markdown-to-jsx"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import {
    getDeckWithCards,
    saveFlashcardsBatch,
    deleteDeck,
    deleteFlashcard,
    updateFlashcard,
    addCardToDeck,
    type Deck,
    type Flashcard
} from "@/app/actions/flashcards"
import { generateFlashcardsAI, type GeneratedCard } from "@/app/actions/generate-cards"
import { createSession, sendMessage } from "@/app/(plataform)/medai/actions"
import { FlashcardRating } from "@/components/flashcards/flashcard-rating" // Import Rating Component

export default function StudyPage() {
    const params = useParams()
    const router = useRouter()
    const deckId = params.deckId as string

    const [deck, setDeck] = useState<Deck | null>(null)
    const [cards, setCards] = useState<Flashcard[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // AI Gen State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false)

    const [aiReferences, setAiReferences] = useState("")
    const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium')
    const [aiAmount, setAiAmount] = useState([10])
    const [fileBase64, setFileBase64] = useState<string>("")
    const [fileName, setFileName] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([])
    const [selectedGenerated, setSelectedGenerated] = useState<number[]>([]) // Indices
    const [step, setStep] = useState<'config' | 'preview'>('config')

    // UX State
    const [direction, setDirection] = useState(0)
    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            transition: { type: "spring" as const, stiffness: 300, damping: 30 }
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8,
            transition: { duration: 0.2 }
        })
    }

    // Tutor State
    const [isTutorOpen, setIsTutorOpen] = useState(false)
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
    const [chatInput, setChatInput] = useState("")
    const [isChatLoading, setIsChatLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)

    // Manage State
    const [isManageOpen, setIsManageOpen] = useState(false)
    const [deckToDelete, setDeckToDelete] = useState<boolean>(false)
    const [editingCardId, setEditingCardId] = useState<string | null>(null)
    const [editFront, setEditFront] = useState("")
    const [editBack, setEditBack] = useState("")
    const [newFront, setNewFront] = useState("")
    const [newBack, setNewBack] = useState("")
    const [isSavingCard, setIsSavingCard] = useState(false)
    const [showAnswersInManager, setShowAnswersInManager] = useState(false) // Privacy default off

    // Carregar dados
    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await getDeckWithCards(deckId)
                if (res) {
                    setDeck(res.deck)
                    setCards(res.cards)
                } else {
                    toast.error("Baralho não encontrado")
                    router.push('/praticar/flashcard')
                }
            } catch (e) {
                console.error(e)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [deckId, router])

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isManageOpen || isAiModalOpen || isTutorOpen) return
            // Ignore if typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

            if (e.key === 'ArrowRight') handleNext()
            if (e.key === 'ArrowLeft') handlePrev()
            if (e.key === ' ') {
                e.preventDefault()
                toggleFlip()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeIndex, cards.length, isManageOpen, isAiModalOpen, isTutorOpen, isFlipped])

    // Navegação
    const handleNext = () => {
        if (activeIndex < cards.length - 1) {
            setDirection(1)
            setIsFlipped(false)
            setChatMessages([])
            setSessionId(null)
            setActiveIndex(prev => prev + 1)
        } else {
            // Fim do deck
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
            toast.success("Parabéns! Baralho concluído.")
        }
    }

    const handlePrev = () => {
        if (activeIndex > 0) {
            setDirection(-1)
            setIsFlipped(false)
            setSessionId(null)
            setChatMessages([])
            setActiveIndex(prev => prev - 1)
        }
    }

    // flip
    const toggleFlip = () => setIsFlipped(!isFlipped)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) { // 10MB
            return toast.error("Arquivo muito grande. Máximo 10MB.")
        }

        if (file.type !== 'application/pdf') {
            return toast.error("Apenas arquivos PDF são aceitos.")
        }

        setFileName(file.name)
        const reader = new FileReader()
        reader.onloadend = () => {
            // reader.result vem como "data:application/pdf;base64,....."
            setFileBase64(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    // --- AI GENERATION ---
    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            const res = await generateFlashcardsAI({
                topic: deck?.title || "Geral",
                details: `${deck?.description || ""} \nObjetivo: ${deck?.study_objective || ""}`,
                references: aiReferences,
                difficulty: aiDifficulty,
                amount: aiAmount[0],
                fileBase64: fileBase64 || undefined,
                deckId: deckId
            })

            if (res.success && res.cards) {
                setGeneratedCards(res.cards)
                setSelectedGenerated(res.cards.map((_, i) => i)) // Seleciona todos por padrão
                setStep('preview')
            } else {
                toast.error("Falha ao gerar cards: " + res.error)
            }
        } catch (e) {
            toast.error("Erro inesperado na IA")
        } finally {
            setIsGenerating(false)
        }
    }

    // ... (handleSaveGenerated and toggleSelection remain same)

    // ... (openTutor and handleSendMessage remain same)


    const handleSaveGenerated = async () => {
        const toSave = generatedCards.filter((_, i) => selectedGenerated.includes(i))
        if (toSave.length === 0) return toast.error("Selecione pelo menos um card")

        try {
            const res = await saveFlashcardsBatch(deckId, toSave)
            if (res.success) {
                toast.success(`${res.count} cards adicionados!`)
                setIsAiModalOpen(false)
                setStep('config')

                setGeneratedCards([])
                // Recarregar deck
                const updated = await getDeckWithCards(deckId)
                if (updated) setCards(updated.cards)
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Erro ao salvar")
        }
    }

    const toggleSelection = (index: number) => {
        setSelectedGenerated(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        )
    }

    // --- TUTOR IA ---
    const openTutor = async () => {
        setIsTutorOpen(true)
        if (!sessionId && chatMessages.length === 0) {
            // 1. Criar sessão
            let currentSessionId = sessionId
            if (!currentSessionId) {
                setIsChatLoading(true)
                try {
                    const session = await createSession()
                    currentSessionId = session.id
                    setSessionId(session.id)
                } catch (e) {
                    toast.error("Erro ao iniciar chat")
                    setIsChatLoading(false)
                    return
                }
            }

            // 2. Enviar prompt inicial
            const currentCard = cards[activeIndex]
            const initialPrompt = `(Contexto do Sistema: O aluno está estudando este flashcard. Frente: "${currentCard.front}", Verso: "${currentCard.back}"). Explique melhor este conceito, dê exemplos clínicos e tire dúvidas de forma didática.`

            // Envia como mensagem do usuário mas marcamos visualmente diferente ou apenas mostramos a resposta?
            // O prompt diz "O usuário vê a explicação inicial da IA". Então o usuário "perguntou" implicitamente.
            // Vou adicionar a pergunta no chat visualmente como "Explicar este card" para ficar claro.

            setChatMessages([{ role: 'user', content: "Explique este card e dê exemplos clínicos." }])

            await handleSendMessage(initialPrompt, currentSessionId, true)
        }
    }

    const handleSendMessage = async (text: string, activeSessionId?: string | null, isInitial = false) => {
        const sid = activeSessionId || sessionId
        if (!text.trim() || !sid) return

        if (!isInitial) {
            setChatMessages(prev => [...prev, { role: 'user', content: text }])
        }

        setIsChatLoading(true)
        setChatInput("")

        try {
            const res = await sendMessage({ sessionId: sid, message: text })

            if (res.success) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: res.message || "Sem resposta." }])
            } else {
                toast.error(res.message || "Erro ao enviar mensagem")
            }
        } catch (error) {
            toast.error("Erro de comunicação com a IA")
        } finally {
            setIsChatLoading(false)
        }
    }

    // --- MANAGE LOGIC ---
    const handleDeleteDeck = async () => {
        if (!deck) return
        try {
            const res = await deleteDeck(deck.id)
            if (res.success) {
                toast.success("Baralho excluído")
                router.push('/praticar/flashcard')
            } else {
                toast.error(res.error || "Erro ao excluir")
            }
        } catch (e) {
            toast.error("Erro inesperado")
        }
    }

    const handleDeleteCard = async (cardId: string) => {
        if (!deck) return
        if (confirm("Excluir este card?")) {
            try {
                const res = await deleteFlashcard(cardId, deck.id)
                if (res.success) {
                    toast.success("Card excluído")
                    setCards(prev => prev.filter(c => c.id !== cardId))
                    if (activeIndex >= cards.length - 1 && activeIndex > 0) setActiveIndex(prev => prev - 1)
                }
            } catch (e) { toast.error("Erro ao excluir") }
        }
    }

    const startEditing = (card: Flashcard) => {
        setEditingCardId(card.id)
        setEditFront(card.front)
        setEditBack(card.back)
    }

    const handleUpdateCard = async () => {
        if (!editingCardId || !deck) return
        try {
            const res = await updateFlashcard(editingCardId, deck.id, editFront, editBack)
            if (res.success) {
                toast.success("Card atualizado")
                setCards(prev => prev.map(c => c.id === editingCardId ? { ...c, front: editFront, back: editBack } : c))
                setEditingCardId(null)
            }
        } catch (e) { toast.error("Erro ao atualizar") }
    }

    const handleAddCard = async () => {
        if (!newFront || !newBack || !deck) return toast.error("Preencha frente e verso")
        setIsSavingCard(true)
        try {
            const res = await addCardToDeck(deck.id, newFront, newBack)
            if (res.success) {
                toast.success("Card criado")
                setNewFront("")
                setNewBack("")
                // Reload to get ID properly or just reload list
                const updated = await getDeckWithCards(deck.id)
                if (updated) setCards(updated.cards)
            }
        } catch (e) { toast.error("Erro ao criar") }
        finally { setIsSavingCard(false) }
    }

    if (isLoading) return <div className="p-10 text-center">Carregando seus estudos...</div>

    if (!deck) return null

    const currentCard = cards[activeIndex]

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-[calc(100vh-80px)] flex flex-col">
            {/* HEADER */}
            <header className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1">
                    <nav className="flex items-center text-sm text-slate-500 mb-1">
                        <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => router.push('/praticar')}>Praticar</span>
                        <span className="mx-2">/</span>
                        <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => router.push('/praticar/flashcard')}>Flashcards</span>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-slate-100" onClick={() => router.push('/praticar/flashcard')}>
                            <ChevronLeft size={20} />
                        </Button>
                        <h1 className="text-xl font-bold truncate max-w-[200px] md:max-w-md" title={deck.title}>{deck.title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="text-slate-500" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsManageOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Gerenciar Cards
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeckToDelete(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir Baralho
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400">
                                <Sparkles size={16} className="mr-2 text-indigo-500" /> Criar com IA
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Gerador de Flashcards IA</DialogTitle>
                                <DialogDescription>
                                    Crie baralhos inteiros em segundos baseados em tópicos médicos.
                                </DialogDescription>
                            </DialogHeader>

                            {step === 'config' ? (
                                <div className="space-y-4 py-4">
                                    {/* CONTEXTO ATIVO (Visual Only) */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider">
                                            <Brain size={14} /> Contexto de Estudo
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{deck?.title}</p>
                                            <p className="text-xs text-slate-500 line-clamp-2">{deck?.study_objective || deck?.description || "Sem objetivos definidos."}</p>
                                        </div>

                                        {/* FILE STATUS INDICATOR */}
                                        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                                            {deck?.temp_file_path ? (
                                                (() => {
                                                    const uploadDate = deck.file_uploaded_at ? new Date(deck.file_uploaded_at) : new Date(0);
                                                    const diffDays = (new Date().getTime() - uploadDate.getTime()) / (1000 * 3600 * 24);
                                                    const isExpired = diffDays > 7;

                                                    return isExpired ? (
                                                        <div className="flex items-center justify-between text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                                                            <span>⚠️ Arquivo expirado. Anexe um novo.</span>
                                                            <div className="relative">
                                                                <Input
                                                                    type="file"
                                                                    accept=".pdf"
                                                                    className="absolute inset-0 opacity-0 w-full cursor-pointer"
                                                                    onChange={handleFileChange}
                                                                />
                                                                <Button variant="outline" size="sm" className="h-6 text-[10px]">Reenviar</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded-md">
                                                            <Check size={12} />
                                                            <span>Arquivo ativo: {deck.original_filename}</span>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-100 p-2 rounded-md">
                                                    <span>Nenhum arquivo de base.</span>
                                                    <div className="relative">
                                                        <Input
                                                            type="file"
                                                            accept=".pdf"
                                                            className="absolute inset-0 opacity-0 w-full cursor-pointer"
                                                            onChange={handleFileChange}
                                                        />
                                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] hover:bg-white">Adicionar</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>



                                    {/* PREFERÊNCIAS (Style) */}
                                    <div className="space-y-2">
                                        <Label>Estilo das Perguntas (Opcional)</Label>
                                        <Input
                                            placeholder="Ex: Focar em casos clínicos, estilo prova de residência..."
                                            value={aiReferences}
                                            onChange={(e) => setAiReferences(e.target.value)}
                                            className="bg-white"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            Deixe vazio para usar o padrão da IA.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* DIFICULDADE */}
                                        <div className="space-y-2">
                                            <Label>Dificuldade</Label>
                                            <select
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={aiDifficulty}
                                                onChange={(e) => setAiDifficulty(e.target.value as any)}
                                            >
                                                <option value="easy">Fácil</option>
                                                <option value="medium">Médio</option>
                                                <option value="hard">Difícil</option>
                                                <option value="mixed">Misto (Recomendado)</option>
                                            </select>
                                        </div>

                                        {/* QUANTIDADE */}
                                        <div className="space-y-2">
                                            <Label>Quantidade: <span className="font-bold text-indigo-600">{aiAmount[0]}</span></Label>
                                            <Slider
                                                value={aiAmount}
                                                onValueChange={setAiAmount}
                                                max={50}
                                                min={3}
                                                step={1}
                                                className="py-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <ScrollArea className="h-[300px] w-full border rounded-md p-4">
                                    <div className="space-y-4">
                                        {generatedCards.map((card, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border group/card">
                                                <Checkbox
                                                    checked={selectedGenerated.includes(i)}
                                                    onCheckedChange={() => toggleSelection(i)}
                                                />
                                                <div className="space-y-1 text-sm w-full">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                                        <span className="text-indigo-500 mr-1">P:</span>{card.front}
                                                    </p>
                                                    <div className="relative group/answer cursor-pointer">
                                                        <span className="absolute left-0 top-0 text-xs text-slate-400 font-mono group-hover/answer:hidden">
                                                            (Passe o mouse para ver a resposta)
                                                        </span>
                                                        <p className="text-slate-600 dark:text-slate-400 blur-sm group-hover/answer:blur-none transition-all duration-300">
                                                            <span className="text-green-600 mr-1 font-bold decoration-slice">R:</span>{card.back}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            <DialogFooter>
                                {step === 'config' ? (
                                    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-indigo-600">
                                        {isGenerating ? <RotateCw className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                                        Gerar Cards
                                    </Button>
                                ) : (
                                    <div className="flex w-full gap-2">
                                        <Button variant="outline" onClick={() => setStep('config')} className="flex-1">voltar</Button>
                                        <Button onClick={handleSaveGenerated} className="flex-1 bg-green-600 hover:bg-green-700">
                                            Adicionar Selecionados
                                        </Button>
                                    </div>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* PROGRESS & TITLE */}
            <div className="text-center mb-8 relative">
                <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider px-2">
                    <span>Início</span>
                    <span>{cards.length > 0 ? `${activeIndex + 1} / ${cards.length}` : "0"}</span>
                    <span>Fim</span>
                </div>
                <Progress value={cards.length > 0 ? ((activeIndex + 1) / cards.length) * 100 : 0} className="h-2 w-full mx-auto" />
            </div>

            {
                cards.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 bg-slate-50 dark:bg-slate-900/50">
                        <Brain className="h-16 w-16 text-slate-300 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Este baralho está vazio</h2>
                        <p className="text-slate-500 mb-6 text-center max-w-sm">Use a IA para gerar conteúdo automaticamente ou adicione cards manualmente.</p>
                        <Button onClick={() => setIsAiModalOpen(true)} className="bg-indigo-600">
                            <Sparkles className="mr-2" /> Gerar Conteúdo com IA
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center perspective-1000">

                        {/* 3D CARD CONTAINER */}
                        {/* 3D CARD CONTAINER */}
                        <div className="relative w-full max-w-xl h-[400px] cursor-pointer group perspective-1000 mx-auto" onClick={toggleFlip}>
                            <AnimatePresence initial={false} mode="wait" custom={direction}>
                                <motion.div
                                    key={activeIndex} // Trigger animation on index change
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    className="absolute inset-0 w-full h-full preserve-3d"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <motion.div
                                        className="w-full h-full relative preserve-3d transition-all duration-500"
                                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                                        transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        {/* BACK (Resposta) */}
                                        <div
                                            className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-xl border-2 border-indigo-100 dark:border-indigo-900 flex flex-col items-center justify-center p-8 text-center"
                                            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                                        >
                                            <span className="text-xs uppercase tracking-widest text-indigo-500 font-bold mb-4">Resposta</span>
                                            <div className="text-lg md:text-xl text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                <Markdown>{cards[activeIndex].back}</Markdown>
                                            </div>

                                            {/* RATING WIDGET */}
                                            <FlashcardRating
                                                cardId={cards[activeIndex].id}
                                                initialLikes={cards[activeIndex].likes_count || 0}
                                                initialDislikes={cards[activeIndex].dislikes_count || 0}
                                            />

                                            {/* TUTOR BUTTON */}
                                            <div className="mt-auto pt-4 border-t w-full flex justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs active:scale-95 transition-transform"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openTutor()
                                                    }}
                                                >
                                                    <MessageCircle size={14} className="mr-1" /> Explicar este Card
                                                </Button>
                                            </div>
                                        </div>

                                        {/* FRONT (Pergunta) */}
                                        <div
                                            className="absolute inset-0 w-full h-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center"
                                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                                        >
                                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Pergunta</span>
                                            <div className="text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-100">
                                                <Markdown>{cards[activeIndex].front}</Markdown>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-auto flex items-center gap-2">
                                                <RotateCw size={12} /> Clique ou [Espaço] para virar
                                            </p>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* CONTROLS */}
                        <div className="mt-8 flex items-center gap-6">
                            <Button
                                size="lg"
                                variant="outline"
                                className="rounded-full w-14 h-14 p-0 border-2 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
                                onClick={handlePrev}
                                disabled={activeIndex === 0}
                                title="Anterior (Seta Esquerda)"
                            >
                                <ArrowLeft size={24} />
                            </Button>

                            <div className="bg-white dark:bg-slate-800 shadow-sm border px-6 py-2 rounded-full font-mono text-sm">
                                {activeIndex + 1} / {cards.length}
                            </div>

                            <Button
                                size="lg"
                                className="rounded-full w-14 h-14 p-0 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
                                onClick={handleNext}
                                disabled={activeIndex === cards.length - 1}
                                title="Próximo (Seta Direita)"
                            >
                                <ArrowRight size={24} />
                            </Button>
                        </div>

                    </div>
                )
            }

            {/* TUTOR SHEET */}
            <Sheet open={isTutorOpen} onOpenChange={setIsTutorOpen}>
                <SheetContent className="w-[90vw] sm:w-[600px] md:w-[700px] lg:w-[800px] flex flex-col sm:max-w-none">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Brain className="text-indigo-600" /> Tutor MedAI
                        </SheetTitle>
                        <SheetDescription>
                            Tire dúvidas sobre o conteúdo deste flashcard.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 my-4 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-4">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`
                    max-w-[90%] p-3 rounded-lg text-sm
                    ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white dark:bg-slate-800 border shadow-sm rounded-bl-none'}
                  `}>
                                    <Markdown className={`prose ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} prose-sm max-w-none`}>
                                        {msg.content}
                                    </Markdown>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border p-3 rounded-lg rounded-bl-none text-sm text-slate-400">
                                    Digitando...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Digite sua dúvida..."
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                        />
                        <Button size="icon" onClick={() => handleSendMessage(chatInput)} disabled={isChatLoading}>
                            <ArrowRight size={18} />
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>


            {/* MANAGE MODAL */}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>Gerenciar Cards ({cards.length})</DialogTitle>
                        <div className="flex items-center gap-2 mr-8">
                            <Checkbox id="show-answers" checked={showAnswersInManager} onCheckedChange={(c) => setShowAnswersInManager(!!c)} />
                            <Label htmlFor="show-answers" className="text-xs">Revelar Respostas</Label>
                        </div>
                    </DialogHeader>

                    {/* ADD NEW */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                        <div className="space-y-2">
                            <Label>Frente (Pergunta)</Label>
                            <Input value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Nova pergunta..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Verso (Resposta)</Label>
                            <Input value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Nova resposta..." />
                        </div>
                        <Button className="md:col-span-2 bg-indigo-600" onClick={handleAddCard} disabled={isSavingCard}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Card
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                            {cards.map((card, i) => (
                                <div key={card.id} className="p-3 border rounded-lg flex flex-col gap-2 group hover:border-indigo-300 transition-colors">
                                    {editingCardId === card.id ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <Input value={editFront} onChange={e => setEditFront(e.target.value)} />
                                                <Input value={editBack} onChange={e => setEditBack(e.target.value)} />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="outline" onClick={() => setEditingCardId(null)}>Cancelar</Button>
                                                <Button size="sm" className="bg-green-600" onClick={handleUpdateCard}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                                <div>
                                                    <span className="text-xs font-bold text-indigo-500 uppercase">Frente</span>
                                                    <p className="text-sm font-medium">{card.front}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-green-500 uppercase">Verso</span>
                                                    <p className={`text-sm text-slate-600 dark:text-slate-400 ${!showAnswersInManager ? 'blur-sm select-none' : ''}`}>
                                                        {card.back}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" onClick={() => startEditing(card)}>
                                                    <Edit className="h-4 w-4 text-slate-400" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="hover:text-red-600" onClick={() => handleDeleteCard(card.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* DELETE DECK CONFIRM */}
            <AlertDialog open={deckToDelete} onOpenChange={setDeckToDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir este baralho?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Todos os cards e seu progresso serão perdidos permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDeck} className="bg-red-600 hover:bg-red-700">
                            Excluir Tudo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
