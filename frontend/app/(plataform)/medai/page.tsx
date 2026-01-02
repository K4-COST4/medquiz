'use client'

import { useState, useEffect, useRef } from "react"
import { Send, Bot, User, Loader2, Plus, MessageSquare, Trash2, Menu, Pencil } from "lucide-react"
import Markdown from 'markdown-to-jsx'
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

import {
    getSessions, createSession, deleteSession, getSessionMessages,
    sendMessage, getRemainingDailyUses, renameSession
} from "./actions"

interface ChatMessage {
    role: 'user' | 'ai'
    content: string
}

interface Session {
    id: string
    title: string | null
    updated_at: string
}

export default function MedAIPage() {
    const { toast } = useToast()
    const scrollRef = useRef<HTMLDivElement>(null)

    // Estados Globais
    const [sessions, setSessions] = useState<Session[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [usesLeft, setUsesLeft] = useState<number | null>(null)

    // Estados do Chat
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    // Estados de Renomear
    const [renameOpen, setRenameOpen] = useState(false)
    const [sessionToRename, setSessionToRename] = useState<Session | null>(null)
    const [newName, setNewName] = useState("")

    // 1. Carregar Sessões e Limite Inicial
    useEffect(() => {
        loadSessions()
        getRemainingDailyUses().then(setUsesLeft)
    }, [])

    // 2. Seleção Automática
    useEffect(() => {
        if (sessions.length > 0 && !currentSessionId) {
            handleSelectSession(sessions[0].id)
        }
    }, [sessions, currentSessionId])

    // 3. Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    // --- AÇÕES ---

    async function loadSessions() {
        const data = await getSessions()
        setSessions(data)
    }

    async function handleNewChat() {
        try {
            const newSession = await createSession()
            setSessions([newSession, ...sessions])
            setCurrentSessionId(newSession.id)
            setMessages([])
            setIsSidebarOpen(false)
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Falha ao criar conversa." })
        }
    }

    async function handleSelectSession(id: string) {
        setCurrentSessionId(id)
        setIsSidebarOpen(false)
        const msgs = await getSessionMessages(id)
        setMessages(msgs)
    }

    async function handleDeleteSession(e: React.MouseEvent, id: string) {
        e.stopPropagation()
        await deleteSession(id)
        const newSessions = sessions.filter(s => s.id !== id)
        setSessions(newSessions)

        if (currentSessionId === id) {
            if (newSessions.length > 0) handleSelectSession(newSessions[0].id)
            else { setCurrentSessionId(null); setMessages([]) }
        }
    }

    // Abrir Modal de Renomear
    const openRenameDialog = (e: React.MouseEvent, session: Session) => {
        e.stopPropagation()
        setSessionToRename(session)
        setNewName(session.title || "")
        setRenameOpen(true)
    }

    // Executar Renomear Manual
    const handleRenameSubmit = async () => {
        if (!sessionToRename || !newName.trim()) return

        await renameSession(sessionToRename.id, newName)

        // Atualiza lista localmente
        setSessions(prev => prev.map(s => s.id === sessionToRename.id ? { ...s, title: newName } : s))
        setRenameOpen(false)
        toast({ title: "Renomeado", description: "Conversa atualizada com sucesso." })
    }

    async function handleSend() {
        if (!input.trim() || isLoading) return

        let activeSessionId = currentSessionId
        if (!activeSessionId) {
            const newSession = await createSession()
            setSessions([newSession, ...sessions])
            setCurrentSessionId(newSession.id)
            activeSessionId = newSession.id
        }

        if (usesLeft !== null && usesLeft <= 0) {
            toast({ variant: "destructive", title: "Limite atingido", description: "Volte amanhã." })
            return
        }

        const text = input
        setInput("")
        setMessages(prev => [...prev, { role: 'user', content: text }])
        setIsLoading(true)

        // @ts-ignore
        const result = await sendMessage({ sessionId: activeSessionId!, message: text })

        if (result.success) {
            setMessages(prev => [...prev, { role: 'ai', content: result.message }])
            if (typeof result.usesLeft === 'number') setUsesLeft(result.usesLeft)

            // Se a IA gerou um novo título automaticamente, atualizamos a lista
            if (result.newTitle) {
                setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: result.newTitle } : s))
            } else {
                loadSessions()
            }

        } else {
            if (result.limitReached) {
                setMessages(prev => [...prev, { role: 'ai', content: "🔒 **Limite diário atingido.**" }])
                setUsesLeft(0)
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.message })
            }
        }
        setIsLoading(false)
    }

    // --- SIDEBAR ---
    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="p-4">
                <Button onClick={handleNewChat} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus size={18} /> Nova Conversa
                </Button>
            </div>

            <div className="px-4 pb-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Histórico</p>
            </div>

            <ScrollArea className="flex-1 px-2">
                <div className="space-y-1">
                    <AnimatePresence initial={false} mode="popLayout">
                        {sessions.map(session => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                whileHover={{ scale: 1.02, x: 4 }}
                                key={session.id}
                                onClick={() => handleSelectSession(session.id)}
                                className={`
                            group flex items-center justify-between p-3 rounded-lg text-sm cursor-pointer transition-all
                            ${currentSessionId === session.id
                                        ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 font-medium text-indigo-600 dark:text-indigo-400'
                                        : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}
                        `}
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <MessageSquare size={16} className="shrink-0" />
                                    <span className="truncate">{session.title || "Nova Conversa"}</span>
                                </div>

                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => openRenameDialog(e, session)}
                                        className="p-1.5 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                                        title="Renomear"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        className="p-1.5 hover:text-red-500 hover:bg-red-100 rounded-md transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs text-center text-slate-500">
                    {usesLeft !== null ? (usesLeft > 0 ? `${usesLeft} créditos hoje` : "Limite atingido") : "Carregando..."}
                </div>
            </div>
        </div>
    )

    return (
        <div className="h-[calc(100vh-2rem)] flex bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">

            {/* MODAL DE RENOMEAR */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Renomear Conversa</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="mb-2 block">Novo Título</Label>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ex: Resumo de Cardiologia..."
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
                        <Button onClick={handleRenameSubmit} className="bg-indigo-600 text-white">Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SIDEBAR */}
            <div className="hidden md:block w-72 shrink-0">
                <SidebarContent />
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">

                {/* Mobile Header */}
                <div className="md:hidden p-4 border-b flex items-center gap-3 bg-white dark:bg-slate-900">
                    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon"><Menu /></Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <SidebarContent />
                        </SheetContent>
                    </Sheet>
                    <span className="font-bold text-lg text-indigo-600 flex items-center gap-2">
                        <Bot size={24} /> MedAI
                    </span>
                </div>

                {/* CHAT AREA */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.1 }
                                }
                            }}
                            className="h-full flex flex-col items-center justify-center text-center opacity-70"
                        >
                            <motion.div
                                variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1 } }}
                                className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6"
                            >
                                <Bot size={40} className="text-indigo-600" />
                            </motion.div>
                            <motion.h2
                                variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                                className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2"
                            >
                                Olá, Doutor(a)!
                            </motion.h2>
                            <motion.p
                                variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                                className="text-slate-500 max-w-md"
                            >
                                Estou pronto para ajudar com casos clínicos, dúvidas ou resumos.
                            </motion.p>
                            {!currentSessionId && (
                                <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                                    <Button onClick={handleNewChat} className="mt-6 bg-indigo-600 text-white">
                                        Começar Agora
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    key={idx}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'ai' && <Avatar className="h-8 w-8 border border-indigo-100 mt-1"><AvatarFallback className="bg-indigo-100 text-indigo-600"><Bot size={16} /></AvatarFallback></Avatar>}

                                    <div className={`
                            max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-sm overflow-hidden
                            ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none'}
                        `}>
                                        {msg.role === 'ai'
                                            ? (
                                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none break-words">
                                                    <Markdown>{msg.content}</Markdown>
                                                </div>
                                            )
                                            : <p className="whitespace-pre-wrap">{msg.content}</p>
                                        }
                                    </div>

                                    {msg.role === 'user' && <Avatar className="h-8 w-8 border border-slate-200 mt-1"><AvatarFallback className="bg-slate-100 text-slate-600"><User size={16} /></AvatarFallback></Avatar>}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex gap-4 justify-start"
                        >
                            <Avatar className="h-8 w-8"><AvatarFallback><Bot size={16} /></AvatarFallback></Avatar>
                            <div className="bg-white dark:bg-slate-900 border p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                                <div className="flex gap-1 h-4 items-center">
                                    {[0, 1, 2].map((dot) => (
                                        <motion.div
                                            key={dot}
                                            className="w-2 h-2 bg-indigo-600 rounded-full"
                                            animate={{ y: [0, -5, 0] }}
                                            transition={{ duration: 0.5, repeat: Infinity, delay: dot * 0.1 }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-slate-400 ml-1">Digitando...</span>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border-t shrink-0">
                    <div className="max-w-3xl mx-auto relative flex gap-2">
                        <Input
                            placeholder={usesLeft === 0 ? "Limite atingido" : "Digite sua dúvida..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isLoading || usesLeft === 0}
                            className="pr-12 h-12 text-base shadow-sm bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                        <Button onClick={handleSend} disabled={isLoading || !input.trim() || usesLeft === 0} size="icon" className="absolute right-1 top-1 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    )
}