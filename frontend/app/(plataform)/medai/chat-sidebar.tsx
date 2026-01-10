'use client'

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, MessageSquare, Trash2, Pencil } from "lucide-react"
import { format, isToday, isYesterday, subDays, isAfter } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Session {
    id: string
    title: string | null
    updated_at: string
}

interface ChatSidebarProps {
    sessions: Session[]
    currentSessionId: string | null
    onSelectSession: (id: string) => void
    onNewChat: () => void
    usesLeft: number | null
    // New Actions
    onRenameClick: (session: Session) => void
    onDeleteClick: (id: string) => void
}

export function ChatSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewChat,
    usesLeft,
    onRenameClick,
    onDeleteClick
}: ChatSidebarProps) {

    // --- DATE GROUPING LOGIC ---
    const groupedSessions = sessions.reduce((groups, session) => {
        const date = new Date(session.updated_at)
        let key = "Antigos"

        if (isToday(date)) key = "Hoje"
        else if (isYesterday(date)) key = "Ontem"
        else if (isAfter(date, subDays(new Date(), 7))) key = "7 Dias"

        if (!groups[key]) groups[key] = []
        groups[key].push(session)
        return groups
    }, {} as Record<string, Session[]>)

    const groupOrder = ["Hoje", "Ontem", "7 Dias", "Antigos"]


    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4">
                <Button onClick={onNewChat} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Plus size={18} className="mr-2" /> Nova Conversa
                </Button>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 px-3">
                <div className="space-y-6 pb-4">
                    {groupOrder.map(group => {
                        const groupSessions = groupedSessions[group]
                        if (!groupSessions?.length) return null

                        return (
                            <div key={group}>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                                    {group}
                                </h3>
                                <div className="space-y-1">
                                    <AnimatePresence initial={false}>
                                        {groupSessions.map(session => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                                key={session.id}
                                                onClick={() => onSelectSession(session.id)}
                                                className={`
                                                    group flex items-center justify-between p-3 rounded-lg text-sm cursor-pointer transition-all relative
                                                    ${currentSessionId === session.id
                                                        ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-black/5 dark:ring-white/5 text-indigo-600 dark:text-indigo-400 font-medium'
                                                        : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}
                                                `}
                                            >
                                                {currentSessionId === session.id && (
                                                    <motion.div
                                                        layoutId="active-pill"
                                                        className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full"
                                                    />
                                                )}

                                                <div className="flex items-center gap-3 overflow-hidden flex-1 pl-2 min-w-0">
                                                    {/* Icon varies? No, std chat icon */}
                                                    <MessageSquare size={16} className="shrink-0 opacity-70" />
                                                    <span className="truncate">{session.title || "Nova Conversa"}</span>
                                                </div>

                                                {/* Actions Buttons (Visible on Hover or Active) */}
                                                <div
                                                    className={`
                                                        flex items-center gap-1 transition-opacity shrink-0
                                                        ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                                    `}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={(e) => { e.stopPropagation(); onRenameClick(session); }}
                                                        title="Renomear"
                                                    >
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={(e) => { e.stopPropagation(); onDeleteClick(session.id); }}
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            {/* Footer / Credits */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 z-10">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Créditos Diários</span>
                    <span className="font-medium">{usesLeft ?? '-'} / 5</span>
                </div>
                {/* Progress bar visual could act here */}
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${!usesLeft ? 'bg-red-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, ((usesLeft || 0) / 5) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
