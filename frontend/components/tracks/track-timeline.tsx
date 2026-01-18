
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LessonAccordion } from "@/components/tracks/lesson-accordion";
import { ChevronDown, Folder, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackTimelineProps {
    modules: any[];
    lessons: any[];
}

export function TrackTimeline({ modules, lessons }: TrackTimelineProps) {
    // State to track expanded modules. Initially, the first module could be expanded.
    // Using an array allows multiple to be open (if desired) or single. Let's allowing multiple.
    const [expandedModules, setExpandedModules] = useState<string[]>(modules.length > 0 ? [modules[0].id] : []);

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) =>
            prev.includes(moduleId)
                ? prev.filter((id) => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    return (
        <div className="relative pl-4 md:pl-8 py-8 space-y-12">

            {/* 1. LINHA VERTICAL CONTÍNUA */}
            <div className="absolute left-[27px] md:left-[43px] top-4 bottom-4 w-1 bg-slate-200 rounded-full" />

            {modules.map((module, index) => {
                // Filter lessons for this module
                const moduleLessons = lessons.filter((l) => l.parent_id === module.id);
                const isExpanded = expandedModules.includes(module.id);

                // Check if module is "started" (has any completed lessons) - mocking logic for now based on lessons
                const hasCompletedLessons = moduleLessons.some((l: any) => l.is_completed);
                const isCompleted = moduleLessons.length > 0 && moduleLessons.every((l: any) => l.is_completed);

                return (
                    <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className="relative z-10"
                    >
                        <div className="flex items-start gap-6 md:gap-8">

                            {/* 2. NÓ (INDICADOR) */}
                            <div
                                className={cn(
                                    "relative z-20 shrink-0 w-8 h-8 rounded-full border-[3px] md:border-4 flex items-center justify-center bg-white transition-all duration-300 shadow-sm",
                                    hasCompletedLessons ? "border-violet-500 text-violet-600 scale-110" : "border-slate-300 text-slate-400",
                                    "hover:scale-125 hover:border-violet-400 cursor-pointer"
                                )}
                                onClick={() => toggleModule(module.id)}
                                title={module.title}
                            >
                                {isCompleted ? (
                                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />
                                ) : (
                                    <span className="text-[10px] font-bold">{index + 1}</span>
                                )}
                            </div>

                            {/* 3. CARD DO MÓDULO */}
                            <div className="flex-1 min-w-0">
                                {/* Conector Visual (Seta) */}
                                <div className="absolute left-[34px] md:left-[50px] top-4 w-4 md:w-6 h-0.5 bg-slate-200 -z-10" />

                                <div
                                    className={cn(
                                        "bg-white border rounded-2xl shadow-sm transition-all duration-300 overflow-hidden",
                                        isExpanded ? "border-violet-200 shadow-md ring-1 ring-violet-50" : "border-slate-200 hover:border-violet-200"
                                    )}
                                >
                                    {/* Header do Accordion */}
                                    <div
                                        onClick={() => toggleModule(module.id)}
                                        className="p-5 md:p-6 cursor-pointer flex items-center justify-between gap-4 select-none group"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <h3
                                                    className={cn(
                                                        "text-lg md:text-xl font-bold text-slate-800 transition-colors",
                                                        isExpanded && "text-violet-700"
                                                    )}
                                                >
                                                    {module.title}
                                                </h3>
                                                {isCompleted && <CheckCircle size={16} className="text-emerald-500" />}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Contador de Aulas */}
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                    <Folder size={12} />
                                                    {moduleLessons.length} Aulas
                                                </span>

                                                {/* Barra de Progresso Visual Fina */}
                                                {moduleLessons.length > 0 && (
                                                    <div className="h-1.5 flex-1 max-w-[100px] bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-400 rounded-full"
                                                            style={{ width: `${(moduleLessons.filter((l: any) => l.is_completed).length / moduleLessons.length) * 100}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <ChevronDown
                                            size={20}
                                            className={cn(
                                                "text-slate-300 transition-transform duration-300 group-hover:text-violet-500",
                                                isExpanded && "rotate-180 text-violet-500"
                                            )}
                                        />
                                    </div>

                                    {/* Conteúdo (Aulas) */}
                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                            >
                                                <div className="px-5 md:px-6 pb-6 pt-0 space-y-3 border-t border-slate-50 bg-slate-50/30">
                                                    <div className="h-4" /> {/* Spacer */}

                                                    {moduleLessons.length > 0 ? (
                                                        moduleLessons.map((lesson, lessonIndex) => (
                                                            <div key={lesson.id} className="relative pl-4">
                                                                {/* Linha ramificada da árvore de aulas */}
                                                                <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-slate-200 -z-10 last:bottom-auto last:h-6" />
                                                                <div className="absolute left-0 top-6 w-3 h-0.5 bg-slate-200" />

                                                                <LessonAccordion
                                                                    lesson={lesson}
                                                                    index={lessonIndex}
                                                                />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-400 italic py-2">
                                                            Nenhuma aula cadastrada ainda.
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
