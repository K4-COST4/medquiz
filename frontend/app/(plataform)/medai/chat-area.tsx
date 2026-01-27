'use client'

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, User, ArrowDown, Pencil, Trash2, X, Copy, Check } from "lucide-react"

import { ChatInput } from "./chat-input"
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
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Menu } from "lucide-react"
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
    // New Mobile Menu Props
    mobileMenuOpen?: boolean
    setMobileMenuOpen?: (open: boolean) => void
    sidebarContent?: React.ReactNode
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
    isSessionActive,
    mobileMenuOpen,
    setMobileMenuOpen,
    sidebarContent
}: ChatAreaProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
    const [copiedId, setCopiedId] = useState<number | null>(null)

    const handleCopy = async (content: string, idx: number) => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(content)
            } else {
                // Fallback for http/mobile dev environments
                const textArea = document.createElement("textarea")
                textArea.value = content
                textArea.style.position = "fixed"
                textArea.style.left = "-9999px"
                textArea.style.top = "0"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
            }
            setCopiedId(idx)
            setTimeout(() => setCopiedId(null), 2000)
        } catch (err) {
            console.error("Failed to copy", err)
        }
    }

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

    // Handlers removed - logic moved to ChatInput


    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative">

            {/* CHAT HEADER (Always visible now for mobile menu access) */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-2 overflow-hidden">
                    {/* MOBILE MENU TRIGGER (Only visible on mobile) */}
                    <div className="md:hidden shrink-0">
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="-ml-2"><Menu size={20} /></Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-80">
                                <VisuallyHidden>
                                    <SheetTitle>Menu de Navegação</SheetTitle>
                                </VisuallyHidden>
                                {sidebarContent}
                            </SheetContent>
                        </Sheet>
                    </div>

                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {chatTitle || "Nova Conversa"}
                    </span>
                </div>

                {/* ACTIONS (Only if session is active) */}
                {isSessionActive && (
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={onRename} title="Renomear">
                            <Pencil size={18} className="text-slate-400 hover:text-indigo-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onDelete} title="Excluir">
                            <Trash2 size={18} className="text-slate-400 hover:text-red-600" />
                        </Button>
                    </div>
                )}
            </div>

            {/* MESSAGES AREA */}
            <div
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
                ref={scrollRef}
                onScroll={handleScroll}
            >
                {messages.length === 0 ? (
                    // EMPTY STATE
                    <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto text-center px-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Bot size={32} className="text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                            Olá, Doutor(a)
                        </h2>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                            Estou pronto para ajudar. Escolha uma sugestão ou digite sua dúvida clínica.
                        </p>

                        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
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
                    <div className="max-w-5xl mx-auto space-y-6 pb-4">
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
                                        group relative
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
                                                    components={{
                                                        table: ({ node, ...props }) => (
                                                            <div className="overflow-x-auto w-full my-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                                                <table className="w-full text-sm text-left border-collapse" {...props} />
                                                            </div>
                                                        ),
                                                        thead: ({ node, ...props }) => (
                                                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-400 font-medium" {...props} />
                                                        ),
                                                        th: ({ node, ...props }) => (
                                                            <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap" {...props} />
                                                        ),
                                                        td: ({ node, ...props }) => (
                                                            <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 min-w-[150px]" {...props} />
                                                        ),
                                                        tr: ({ node, ...props }) => (
                                                            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors" {...props} />
                                                        )
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        )}

                                        {/* COPY BUTTON */}
                                        <button
                                            onClick={() => handleCopy(msg.content, idx)}
                                            className={`
                                                absolute -bottom-6 right-0 p-1.5 rounded-full 
                                                text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400
                                                opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all
                                                ${copiedId === idx ? 'text-green-500 hover:text-green-600' : ''}
                                            `}
                                            title="Copiar texto"
                                        >
                                            {copiedId === idx ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
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

            <ChatInput
                onSend={onSend}
                isLoading={isLoading}
                usesLeft={usesLeft}
            />
        </div>
    )
}