'use client'

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Loader2, StopCircle, ArrowDown, MoreVertical, Pencil, Trash2, Paperclip, X } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface ChatMessage {
    role: 'user' | 'ai'
    content: string
}

interface ChatAreaProps {
    messages: ChatMessage[]
    isLoading: boolean
    onSend: (message: string, attachment?: string) => void
    input: string
    setInput: (v: string) => void
    usesLeft: number | null
    // New props for header actions
    chatTitle?: string
    onRename?: () => void
    onDelete?: () => void
    isSessionActive: boolean
}

const SUGGESTIONS = [
    { title: "Caso Clínico", desc: "Crie um caso de cetoacidose diabética" },
    { title: "Farmacologia", desc: "Explique o mecanismo da Furosemida" },
    { title: "Fisiologia", desc: "Resuma o Ciclo Cardíaco" },
    { title: "Diretrizes", desc: "Qual o alvo pressórico na HAS?" }
]

export function ChatArea({
    messages,
    isLoading,
    onSend,
    input,
    setInput,
    usesLeft,
    chatTitle,
    onRename,
    onDelete,
    isSessionActive
}: ChatAreaProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

    // Attachment State
    const [attachment, setAttachment] = useState<{ name: string, base64: string, type: string } | null>(null)

    // Auto-scroll logic
    useEffect(() => {
        if (shouldAutoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading, shouldAutoScroll])

    // Detect user scroll up
    const handleScroll = () => {
        if (!scrollRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
        setShouldAutoScroll(isAtBottom)
    }

    const handleSubmit = () => {
        if ((!input.trim() && !attachment) || isLoading) return

        onSend(input, attachment?.base64) // Pass attachment
        setAttachment(null) // Clear attachment
        setShouldAutoScroll(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    // File Handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert("Arquivo muito grande (Máx 5MB)")
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const base64 = event.target?.result as string
            setAttachment({
                name: file.name,
                type: file.type,
                base64: base64
            })
        }
        reader.readAsDataURL(file)

        // Reset input value to allow selecting same file again
        e.target.value = ''
    }

    const removeAttachment = () => setAttachment(null)


    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative">

            {/* CHAT HEADER (Only if session is active) */}
            {isSessionActive && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10 sticky top-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {chatTitle || "Nova Conversa"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={onRename} title="Renomear">
                            <Pencil size={18} className="text-slate-400 hover:text-indigo-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onDelete} title="Excluir">
                            <Trash2 size={18} className="text-slate-400 hover:text-red-600" />
                        </Button>
                    </div>
                </div>
            )}

            {/* MESSAGES AREA */}
            <div
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
                ref={scrollRef}
                onScroll={handleScroll}
            >
                {messages.length === 0 ? (
                    // EMPTY STATE
                    <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Bot size={32} className="text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                            Olá, Doutor(a)
                        </h2>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                            Estou pronto para ajudar. Escolha uma sugestão ou digite sua dúvida clínica.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s.title}
                                    onClick={() => onSend(s.desc)}
                                    className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl text-left hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group"
                                >
                                    <span className="block font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                                        {s.title}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate block">
                                        {s.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // MESSAGES
                    <div className="max-w-3xl mx-auto space-y-6 pb-4">
                        <AnimatePresence initial={false}>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={idx}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'ai' && (
                                        <Avatar className="h-8 w-8 border mt-1 shrink-0">
                                            <AvatarFallback className="bg-indigo-50 text-indigo-600">
                                                <Bot size={16} />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div className={`
                                        max-w-[85%] md:max-w-[80%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed
                                        ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none'}
                                    `}>
                                        {msg.role === 'ai' ? (
                                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none break-words">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath, remarkGfm]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                    </div>

                                    {msg.role === 'user' && (
                                        <Avatar className="h-8 w-8 border mt-1 shrink-0">
                                            <AvatarFallback className="bg-slate-100 text-slate-600">
                                                <User size={16} />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </motion.div>
                            ))}

                            {/* TYPING INDICATOR */}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-4 justify-start"
                                >
                                    <Avatar className="h-8 w-8 border shrink-0">
                                        <AvatarFallback className="bg-indigo-50 text-indigo-600">
                                            <Bot size={16} />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 h-14 w-28 shadow-sm">
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map((dot) => (
                                                <motion.div
                                                    key={dot}
                                                    className="w-2 h-2 bg-indigo-400 rounded-full"
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: dot * 0.1 }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* SCROLL TO BOTTOM BUTTON */}
            {!shouldAutoScroll && (
                <button
                    onClick={() => { setShouldAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border shadow-lg rounded-full p-2 text-slate-500 hover:text-indigo-600 transition-all z-10"
                >
                    <ArrowDown size={18} />
                </button>
            )}

            {/* INPUT AREA */}
            <div className="p-4 bg-white dark:bg-slate-950/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800">

                {/* Visual Attachment Badge */}
                <AnimatePresence>
                    {attachment && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-2 mb-2 flex items-center justify-between shadow-sm max-w-max"
                        >
                            <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                <span className="p-1 bg-white dark:bg-slate-950 rounded border border-indigo-100 dark:border-indigo-900">
                                    {attachment.type.includes('image') ? '🖼️' : '📄'}
                                </span>
                                <span className="truncate max-w-[200px]">{attachment.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-2 hover:bg-white/50 dark:hover:bg-slate-950/50 rounded-full text-indigo-400 hover:text-red-500"
                                onClick={removeAttachment}
                            >
                                <X size={12} />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="max-w-3xl mx-auto relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex items-end">

                    {/* File Input (Hidden) & Trigger */}
                    <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 mb-1 ml-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                        title="Anexar arquivo (PDF ou Imagem)"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || (usesLeft !== null && usesLeft <= 0)}
                    >
                        <Paperclip size={18} />
                    </Button>

                    <Textarea
                        ref={textareaRef}
                        placeholder={usesLeft && usesLeft > 0 ? "Pergunte ao MedAI..." : "Limite diário atingido"}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading || (usesLeft !== null && usesLeft <= 0)}
                        className="bg-transparent border-none focus-visible:ring-0 resize-none min-h-[50px] max-h-[200px] text-base py-3 pr-12 flex-1"
                        rows={1}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                    <div className="absolute right-2 bottom-2">
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || (!input.trim() && !attachment) || (usesLeft !== null && usesLeft <= 0)}
                            size="icon"
                            className={`h-9 w-9 transition-all ${input.trim() || attachment ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}
                        >
                            {isLoading ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} />}
                        </Button>
                    </div>
                </div>
                <div className="max-w-3xl mx-auto mt-2 text-center text-xs text-slate-400">
                    MedAI pode cometer erros. Verifique informações médicas críticas.
                </div>
            </div>
        </div>
    )
}
