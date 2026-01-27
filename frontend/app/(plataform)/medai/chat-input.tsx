'use client'

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, StopCircle, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
    onSend: (message: string, attachment?: string) => void
    isLoading: boolean
    usesLeft: number | null
}

export function ChatInput({ onSend, isLoading, usesLeft }: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [input, setInput] = useState("")
    const [attachment, setAttachment] = useState<{ name: string, base64: string, type: string } | null>(null)

    const handleSubmit = () => {
        if ((!input.trim() && !attachment) || isLoading) return
        onSend(input, attachment?.base64)
        setInput("")
        setAttachment(null)
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

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
        e.target.value = ''
    }

    const removeAttachment = () => setAttachment(null)

    return (
        <div className="w-full max-w-5xl mx-auto space-y-2 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent pb-0 md:pb-0">
            {/* Visual Attachment Badge */}
            <AnimatePresence>
                {attachment && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-2 flex items-center justify-between shadow-sm max-w-max mx-4 md:mx-0"
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

            <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex items-end mx-2 md:mx-0">
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
                    className="h-9 w-9 mb-1 ml-1 text-slate-400 hover:text-indigo-600 hover:bg-indogo-50 dark:hover:bg-slate-800 shrink-0"
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
                    className="bg-transparent border-none focus-visible:ring-0 resize-none min-h-[44px] max-h-[150px] text-sm py-3 pr-10 flex-1"
                    rows={1}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                />
                <div className="mb-1 mr-1">
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || (!input.trim() && !attachment) || (usesLeft !== null && usesLeft <= 0)}
                        size="icon"
                        className={`h-8 w-8 transition-all shrink-0 ${input.trim() || attachment ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}
                    >
                        {isLoading ? <StopCircle size={16} className="animate-pulse" /> : <Send size={16} />}
                    </Button>
                </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 space-y-1">
                <p>MedAI pode cometer erros. Verifique informações médicas críticas.</p>
                <div className="flex items-center justify-center gap-2 opacity-80">
                    <a href="/legal/termos" className="hover:text-indigo-500 transition-colors" target="_blank" rel="noopener noreferrer">Termos de Uso</a>
                    <span>•</span>
                    <a href="/legal/privacidade" className="hover:text-indigo-500 transition-colors" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
                </div>
            </div>
        </div>
    )
}
