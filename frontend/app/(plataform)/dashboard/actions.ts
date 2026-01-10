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
    is_new_user: boolean;
    activity_dates: string[];
}

export async function getDashboardData(): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
    const supabase = await createClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Usuário não autenticado." };

        // 1. Profile (Hearts, Basic Info)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, hearts, last_heart_update, streak_count')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("Erro Profile:", profileError);
            return { success: false, error: `Erro Profile: ${profileError.message}` };
        }

        // 2. Streak
        const { data: streakData } = await supabase
            .from('user_streaks')
            .select('current_streak, last_activity_date')
            .eq('user_id', user.id)
            .maybeSingle();

        // 3. User Statistics & Calendar Data
        // Optimization: Fetch all history timestamps for calendar and count
        const { data: historyData, error: historyError } = await supabase
            .from('user_question_history')
            .select('answered_at')
            .eq('user_id', user.id);

        if (historyError) console.error("Erro History:", historyError);

        const totalQuestions = historyData?.length || 0;

        // Process Dates for Calendar (Unique YYYY-MM-DD)
        const activityDates = Array.from(new Set(
            (historyData || [])
                .map(h => h.answered_at ? h.answered_at.split('T')[0] : null)
                .filter(Boolean) as string[]
        ));

        // 4. Last Active Module
        const { data: progressDataRaw, error: progressError } = await supabase
            .from('user_node_progress')
            .select('node_id, current_level, updated_at, study_nodes(title)')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // --- PROCESSING ---

        // --- PROCESSING ---

        const elo = 0;
        // FIX: Prioritize profiles.streak_count as it is the one used in Layout/Sidebar
        const streak = profile.streak_count || streakData?.current_streak || 0;
        const lastActivity = streakData?.last_activity_date || null;

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
                is_new_user: totalQuestions === 0,
                activity_dates: activityDates
            }
        };

    } catch (error: any) {
        console.error("Dashboard Critical Error:", error);
        return { success: false, error: `Erro Interno: ${error.message}` };
    }
}
