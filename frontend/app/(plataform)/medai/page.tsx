'use client'

import { useState, useEffect } from "react"
import { Bot, Menu, Sheet as SheetIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

import {
    getSessions, createSession, deleteSession, getSessionMessages,
    sendMessage, getRemainingDailyUses, renameSession
} from "./actions"

import { ChatSidebar } from "./chat-sidebar"
import { ChatArea } from "./chat-area"

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

    // --- GLOBAL STORES ---
    const [sessions, setSessions] = useState<Session[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [usesLeft, setUsesLeft] = useState<number | null>(null)

    // --- UI STATE ---
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // --- DIALOG STATE (Hoisted) ---
    const [renameOpen, setRenameOpen] = useState(false)
    const [sessionToRename, setSessionToRename] = useState<Session | null>(null)
    const [newName, setNewName] = useState("")

    const [deleteOpen, setDeleteOpen] = useState(false)
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

    // 1. Initial Load
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [loadedSessions, remaining] = await Promise.all([
            getSessions(),
            getRemainingDailyUses()
        ])
        setSessions(loadedSessions)
        setUsesLeft(remaining)

        // Select most recent if available
        if (loadedSessions.length > 0 && !currentSessionId) {
            selectSession(loadedSessions[0].id)
        }
    }

    // 2. Select Session Logic
    const selectSession = async (id: string) => {
        setCurrentSessionId(id)
        setMobileMenuOpen(false)

        // Optimistic clear (optional, but good for perceived speed)
        setMessages([])

        const msgs = await getSessionMessages(id)
        setMessages(msgs)
    }

    // 3. New Chat Logic
    const handleNewChat = () => {
        setCurrentSessionId(null)
        setMessages([])
        setMobileMenuOpen(false)
    }

    // 4. SEND MESSAGE (Main Action)
    const handleSend = async (message: string, attachment?: string) => {
        if (isLoading) return
        if (!message.trim() && !attachment) return

        setIsLoading(true)

        // Optimistic User Message
        const displayContent = message + (attachment ? "\n\n📎 *[Arquivo Anexado]*" : "")
        const userMsg: ChatMessage = { role: 'user', content: displayContent }

        setMessages(prev => [...prev, userMsg])
        setInput("")

        try {
            let activeId = currentSessionId

            // If no session, create one first
            if (!activeId) {
                const newSession = await createSession()
                setSessions(prev => [newSession, ...prev])
                setCurrentSessionId(newSession.id)
                activeId = newSession.id
            }

            if (!activeId) throw new Error("Falha ao criar sessão")

            // Call AI
            const res = await sendMessage({
                sessionId: activeId,
                message: message,
                fileBase64: attachment
            })

            if (res.success) {
                const aiMsg: ChatMessage = { role: 'ai', content: res.message }
                setMessages(prev => [...prev, aiMsg])

                // Update quota locally
                if (res.usesLeft !== undefined) setUsesLeft(res.usesLeft)

                // Update title if generated
                if (res.newTitle) {
                    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, title: res.newTitle } : s))
                } else if (!currentSessionId) {
                    // Logic to ensure consistency for new chats
                    const updatedList = await getSessions()
                    setSessions(updatedList)
                }
            } else {
                if (res.limitReached) {
                    setMessages(prev => [...prev, { role: 'ai', content: "🔒 **Limite diário atingido.**" }])
                    setUsesLeft(0)
                } else {
                    toast({ variant: "destructive", title: "Erro", description: res.message })
                }
            }

        } catch (error) {
            console.error(error)
            toast({ variant: "destructive", title: "Falha na conexão", description: "Tente novamente." })
        } finally {
            setIsLoading(false)
        }
    }

    // 5. OPTIMISTIC RENAME
    const handleRename = async (id: string, newTitle: string) => {
        const originalSessions = [...sessions]

        // Optimistic Update
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))

        try {
            await renameSession(id, newTitle)
        } catch (error) {
            // Revert on error
            setSessions(originalSessions)
            toast({ variant: "destructive", title: "Erro ao renomear", description: "As alterações foram revertidas." })
        }
    }

    // 6. OPTIMISTIC DELETE
    const handleDelete = async (id: string) => {
        const originalSessions = [...sessions]

        // Optimistic Update
        const newSessions = sessions.filter(s => s.id !== id)
        setSessions(newSessions)

        // Redirect logic if deleting current
        if (currentSessionId === id) {
            if (newSessions.length > 0) selectSession(newSessions[0].id)
            else handleNewChat()
        }

        try {
            await deleteSession(id)
            toast({ title: "Conversa excluída" })
        } catch (error) {
            // Revert on error
            setSessions(originalSessions)
            // Restore selection if needed logic could go here but it's edge case
            toast({ variant: "destructive", title: "Erro ao excluir", description: "A conversa voltou." })
        }
    }

    // --- DIALOG HANDLERS ---
    const openRename = (session: Session) => {
        setSessionToRename(session)
        setNewName(session.title || "")
        setRenameOpen(true)
    }

    const openDelete = (id: string) => {
        setSessionToDelete(id)
        setDeleteOpen(true)
    }

    const confirmRename = async () => {
        if (sessionToRename && newName.trim()) {
            await handleRename(sessionToRename.id, newName)
            setRenameOpen(false)
        }
    }

    const confirmDelete = async () => {
        if (sessionToDelete) {
            await handleDelete(sessionToDelete)
            setDeleteOpen(false)
        }
    }


    return (
        <div className="h-[calc(100vh-2rem)] flex bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm font-sans">

            {/* DESKTOP SIDEBAR */}
            <div className="hidden md:block w-72 shrink-0">
                <ChatSidebar
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onSelectSession={selectSession}
                    onNewChat={handleNewChat}
                    onRenameClick={openRename}
                    onDeleteClick={openDelete}
                    usesLeft={usesLeft}
                />
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative">

                {/* MOBILE HEADER */}
                <div className="md:hidden p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 z-20">
                    <div className="flex items-center gap-2">
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon"><Menu /></Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-80">
                                <ChatSidebar
                                    sessions={sessions}
                                    currentSessionId={currentSessionId}
                                    onSelectSession={selectSession}
                                    onNewChat={handleNewChat}
                                    onRenameClick={openRename}
                                    onDeleteClick={openDelete}
                                    usesLeft={usesLeft}
                                />
                            </SheetContent>
                        </Sheet>
                        <span className="font-bold text-indigo-600 flex items-center gap-2 text-lg">
                            <Bot size={20} /> MedAI
                        </span>
                    </div>
                    {/* Add visual indicator of credits on mobile header? Optional. */}
                    <div className="text-xs font-medium text-slate-400">
                        {usesLeft !== null ? `${usesLeft}/5` : ''}
                    </div>
                </div>

                {/* CHAT AREA */}
                <ChatArea
                    messages={messages}
                    isLoading={isLoading}
                    onSend={handleSend}
                    input={input}
                    setInput={setInput}
                    usesLeft={usesLeft}
                    isSessionActive={!!currentSessionId}
                    chatTitle={sessions.find(s => s.id === currentSessionId)?.title || "Nova Conversa"}
                    onRename={() => {
                        const s = sessions.find(s => s.id === currentSessionId)
                        if (s) openRename(s)
                    }}
                    onDelete={() => {
                        if (currentSessionId) openDelete(currentSessionId)
                    }}
                />

                {/* --- HOISTED MODALS --- */}
                <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Renomear Conversa</DialogTitle>
                        </DialogHeader>
                        <div className="py-2">
                            <Label>Novo Título</Label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && confirmRename()}
                                className="mt-1"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
                            <Button onClick={confirmRename}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O histórico será perdido permanentemente.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>
        </div>
    )
}
