'use server';

import { createClient } from "@/utils/supabase/server";

export interface DashboardData {
    user: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
    stats: {
        hearts: number;
        streak: number;
        elo: number;
        last_activity: string | null;
        total_questions: number;
        next_heart_at: string | null;
    };
    progress: {
        last_module_id: string | null;
        last_module_title: string | null;
        last_module_progress: number;
    } | null;
    activeTracks: {
        id: string;
        title: string;
        progress: number;
        last_accessed: string;
    }[];
    userDecks: {
        id: string;
        title: string;
        card_count: number;
    }[];
    is_new_user: boolean;
    activity_dates: string[];
}

export async function getDashboardData(): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
    const supabase = await createClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Usuário não autenticado." };

        // 1. Profile (Hearts, Basic Info, Streak source of truth)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, hearts, last_heart_update, streak_count, last_study_date')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("Erro Profile:", profileError);
            return { success: false, error: `Erro Profile: ${profileError.message}` };
        }

        // 2. Streak & Activity (Source: Profiles)
        // We use profile.streak_count and profile.last_study_date as the single source of truth.
        const currentStreak = profile.streak_count || 0;
        const lastActivity = profile.last_study_date || null;

        // 3. User Statistics & Calendar Data
        const { data: historyData, error: historyError } = await supabase
            .from('user_question_history')
            .select('answered_at')
            .eq('user_id', user.id);

        if (historyError) console.error("Erro History:", historyError);

        const totalQuestions = historyData?.length || 0;

        // Process Dates for Calendar (Merge History + Streak Inference)
        const historyDates = (historyData || [])
            .map(h => h.answered_at ? h.answered_at.split('T')[0] : null)
            .filter(Boolean) as string[];

        // INFERENCE: Use profile.last_study_date to reconstruct visual streak
        const inferredDates: string[] = [];

        if (currentStreak > 0 && profile.last_study_date) {
            const lastDate = new Date(profile.last_study_date);
            for (let i = 0; i < currentStreak; i++) {
                const d = new Date(lastDate);
                d.setDate(d.getDate() - i);
                inferredDates.push(d.toISOString().split('T')[0]);
            }
        }

        const activityDates = Array.from(new Set([...historyDates, ...inferredDates]));

        // 4. Last Active Module (Legacy support)
        const { data: progressDataRaw } = await supabase
            .from('user_node_progress')
            .select('node_id, current_level, updated_at, study_nodes(title)')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 5. Custom Tracks (My Studies)
        // Fetch explicit custom tracks created by the user
        const { data: customTracksRaw } = await supabase
            .from('study_nodes')
            .select('id, title, created_at, user_node_progress(current_level)')
            .eq('user_id', user.id)
            .eq('node_type', 'custom_track')
            .order('created_at', { ascending: false })
            .limit(50);

        const activeTracks = (customTracksRaw || []).map((t: any) => {
            // Calculate progress if available
            const progressEntry = t.user_node_progress?.[0]; // Assuming 1:N but typically 1:1 per user
            const currentLevel = progressEntry?.current_level || 0;
            return {
                id: t.id,
                title: t.title,
                progress: (currentLevel / 3) * 100, // Approximation
                last_accessed: t.created_at // Fallback to created_at since updated_at is missing
            };
        });

        // 6. User Decks (Correct Table: 'decks')
        const { data: userDecksRaw } = await supabase
            .from('decks') // Changed from 'flashcard_decks'
            .select('id, title, flashcards(count)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(4);

        const userDecks = (userDecksRaw || []).map((d: any) => ({
            id: d.id,
            title: d.title,
            card_count: d.flashcards?.[0]?.count || 0 // Assuming simple count join
        }));

        // --- PROCESSING ---

        const elo = 0;
        const streak = currentStreak;
        // lastActivity is already set above from profile.last_study_date

        let formattedProgress = null;
        if (progressDataRaw) {
            formattedProgress = {
                last_module_id: progressDataRaw.node_id,
                last_module_title: (progressDataRaw.study_nodes as any)?.title || "Módulo Recente",
                last_module_progress: ((progressDataRaw.current_level || 0) / 3) * 100
            };
        }

        // Heart Regeneration Logic
        let nextHeartAt = null;
        if ((profile.hearts || 0) < 5 && profile.last_heart_update) {
            const REGEN_TIME_MS = 30 * 60 * 1000; // 30 Minutes
            const lastUpdate = new Date(profile.last_heart_update).getTime();
            nextHeartAt = new Date(lastUpdate + REGEN_TIME_MS).toISOString();
        }

        return {
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: profile.full_name || "Estudante",
                    avatar_url: profile.avatar_url
                },
                stats: {
                    hearts: profile.hearts ?? 5,
                    streak: streak,
                    elo: elo,
                    last_activity: lastActivity,
                    total_questions: totalQuestions,
                    next_heart_at: nextHeartAt
                },
                progress: formattedProgress,
                activeTracks: activeTracks,
                userDecks: userDecks,
                is_new_user: totalQuestions === 0,
                activity_dates: activityDates
            }
        };

    } catch (error: any) {
        console.error("Dashboard Critical Error:", error);
        return { success: false, error: `Erro Interno: ${error.message}` };
    }
}
