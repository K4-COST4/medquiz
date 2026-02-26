/**
 * Centralized Quota Management
 * 
 * Single source of truth for AI usage limits.
 * Evita duplicação em medai-core, generate-cards, e flashcard-batching.
 */

import { createClient } from '@/utils/supabase/server';

// ============================================================================
// LIMITES (Centralizado)
// ============================================================================
export const QUOTA_LIMITS = {
    general: 10,      // 10 chamadas/dia
    flashcard: 1,     // 1 geração/dia
    track: 1,         // 1 por semana
    trackCooldownDays: 7,
    clinical: 3,      // 3 sessões clínicas/dia
    summary: 10,      // 10 resumos/semana
} as const;

export type QuotaType = 'general' | 'flashcard' | 'track' | 'clinical' | 'summary' | 'unlimited';

// Retorna a semana ISO atual no formato "YYYY-WW"
function getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${year}-${String(week).padStart(2, '0')}`;
}

export interface QuotaCheckResult {
    allowed: boolean;
    remaining: number;
    error?: string;
}

// ============================================================================
// CHECK QUOTA
// ============================================================================
export async function checkQuota(
    userId: string,
    type: QuotaType
): Promise<QuotaCheckResult> {
    if (type === 'unlimited') {
        return { allowed: true, remaining: Infinity };
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: profile } = await supabase
        .from('profiles')
        .select('ai_usage_count, ai_usage_date, daily_flashcards_count, daily_clinical_count, last_track_generation_date, weekly_summary_count, last_summary_week')
        .eq('id', userId)
        .single();

    if (!profile) {
        return { allowed: true, remaining: 1 }; // Novo usuário, permite
    }

    switch (type) {
        case 'flashcard': {
            let count = 0;
            if (profile.ai_usage_date === today) {
                count = profile.daily_flashcards_count || 0;
            }
            const remaining = Math.max(0, QUOTA_LIMITS.flashcard - count);
            return {
                allowed: count < QUOTA_LIMITS.flashcard,
                remaining,
                error: remaining === 0 ? 'Limite diário de Flashcards atingido (1 por dia).' : undefined,
            };
        }

        case 'track': {
            const lastDate = profile.last_track_generation_date
                ? new Date(profile.last_track_generation_date)
                : null;

            if (lastDate) {
                const diffMs = Math.abs(Date.now() - lastDate.getTime());
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays < QUOTA_LIMITS.trackCooldownDays) {
                    const wait = QUOTA_LIMITS.trackCooldownDays - diffDays;
                    return {
                        allowed: false,
                        remaining: 0,
                        error: `Limite de 1 trilha por semana. Aguarde ${wait} dias.`,
                    };
                }
            }
            return { allowed: true, remaining: 1 };
        }

        case 'general': {
            let count = 0;
            if (profile.ai_usage_date === today) {
                count = profile.ai_usage_count || 0;
            }
            const remaining = Math.max(0, QUOTA_LIMITS.general - count);
            return {
                allowed: count < QUOTA_LIMITS.general,
                remaining,
                error: remaining === 0 ? 'Limite diário geral atingido.' : undefined,
            };
        }

        case 'clinical': {
            let count = 0;
            if (profile.ai_usage_date === today) {
                count = profile.daily_clinical_count || 0;
            }
            const remaining = Math.max(0, QUOTA_LIMITS.clinical - count);
            return {
                allowed: count < QUOTA_LIMITS.clinical,
                remaining,
                error: remaining === 0 ? 'Limite diário de treinos clínicos atingido (3 por dia).' : undefined,
            };
        }

        case 'summary': {
            const currentWeek = getCurrentWeek();
            let count = 0;
            if (profile.last_summary_week === currentWeek) {
                count = profile.weekly_summary_count || 0;
            }
            const remaining = Math.max(0, QUOTA_LIMITS.summary - count);
            return {
                allowed: count < QUOTA_LIMITS.summary,
                remaining,
                error: remaining === 0 ? `Limite semanal de resumos atingido (${QUOTA_LIMITS.summary}/semana).` : undefined,
            };
        }

        default:
            return { allowed: true, remaining: Infinity };
    }
}

// ============================================================================
// CONSUME QUOTA (Incrementa após uso bem-sucedido)
// ============================================================================
export async function consumeQuota(
    userId: string,
    type: QuotaType
): Promise<void> {
    if (type === 'unlimited') return;

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: profile } = await supabase
        .from('profiles')
        .select('ai_usage_count, ai_usage_date, daily_flashcards_count, daily_clinical_count, weekly_summary_count, last_summary_week')
        .eq('id', userId)
        .single();

    const updates: Record<string, any> = { ai_usage_date: today };
    const isToday = profile?.ai_usage_date === today;

    switch (type) {
        case 'flashcard': {
            updates.daily_flashcards_count = (isToday ? (profile?.daily_flashcards_count || 0) : 0) + 1;
            if (!isToday) updates.ai_usage_count = 0;
            break;
        }

        case 'track': {
            updates.last_track_generation_date = new Date().toISOString();
            delete updates.ai_usage_date; // Não afeta ciclo diário
            break;
        }

        case 'general': {
            updates.ai_usage_count = (isToday ? (profile?.ai_usage_count || 0) : 0) + 1;
            if (!isToday) updates.daily_flashcards_count = 0;
            break;
        }

        case 'clinical': {
            updates.daily_clinical_count = (isToday ? (profile?.daily_clinical_count || 0) : 0) + 1;
            if (!isToday) updates.ai_usage_count = 0;
            break;
        }

        case 'summary': {
            const currentWeek = getCurrentWeek();
            const isThisWeek = profile?.last_summary_week === currentWeek;
            updates.weekly_summary_count = (isThisWeek ? (profile?.weekly_summary_count || 0) : 0) + 1;
            updates.last_summary_week = currentWeek;
            delete updates.ai_usage_date; // Não afeta ciclo diário
            break;
        }
    }

    if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', userId);
    }
}
