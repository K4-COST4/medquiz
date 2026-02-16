'use server';

import { createClient } from '@/utils/supabase/server';
import {
    calculateNextReview,
    calculateDueDate,
    createInitialState,
    ratingToQuality,
    type SRSRating,
    type SRSState
} from '@/lib/srs-algorithm';
import { revalidatePath } from 'next/cache';

export interface DueCard {
    id: string;
    cardId: string;
    deckId: string;
    deckTitle: string;
    front: string;
    back: string;
    dueAt: string;
    state: string;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    lapses: number;
}

export interface SRSStats {
    new: number;
    learning: number;
    review: number;
    dueToday: number;
}

/**
 * Buscar cards devidos (global ou por deck)
 * Query: WHERE due_at <= NOW() (Postgres usa índice normalmente)
 */
export async function getDueCards(deckId?: string): Promise<DueCard[]> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error('Não autenticado');
        }

        // Query base
        let query = supabase
            .from('flashcard_srs_state')
            .select(`
        id,
        card_id,
        deck_id,
        due_at,
        state,
        ease_factor,
        interval_days,
        repetitions,
        lapses,
        flashcards!inner(id, front, back),
        decks!inner(id, title)
      `)
            .eq('user_id', user.id)
            .lte('due_at', new Date().toISOString())
            .order('due_at', { ascending: true });

        // Filtrar por deck se especificado
        if (deckId) {
            query = query.eq('deck_id', deckId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('getDueCards error:', error);
            throw new Error('Erro ao buscar cards devidos');
        }

        // Mapear para DueCard
        return (data || []).map((row: any) => ({
            id: row.id,
            cardId: row.card_id,
            deckId: row.deck_id,
            deckTitle: row.decks.title,
            front: row.flashcards.front,
            back: row.flashcards.back,
            dueAt: row.due_at,
            state: row.state,
            easeFactor: parseFloat(row.ease_factor),
            intervalDays: parseFloat(row.interval_days),
            repetitions: row.repetitions,
            lapses: row.lapses,
        }));
    } catch (error) {
        console.error('getDueCards error:', error);
        return [];
    }
}

/**
 * Registrar revisão (atualiza estado + insere log)
 */
export async function recordReview(
    cardId: string,
    deckId: string,
    rating: SRSRating,
    responseTimeMs?: number
): Promise<{ success: boolean; nextReview?: Date; newInterval?: number; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: 'Não autenticado' };
        }

        // Buscar estado atual (ou criar se não existir - lazy init)
        let { data: currentStateRow, error: fetchError } = await supabase
            .from('flashcard_srs_state')
            .select('*')
            .eq('user_id', user.id)
            .eq('card_id', cardId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // Erro diferente de "not found"
            console.error('fetchError:', fetchError);
            return { success: false, error: 'Erro ao buscar estado SRS' };
        }

        // Se não existir, criar estado inicial
        if (!currentStateRow) {
            const initialState = createInitialState();
            const { data: newStateRow, error: insertError } = await supabase
                .from('flashcard_srs_state')
                .insert({
                    user_id: user.id,
                    card_id: cardId,
                    deck_id: deckId,
                    state: initialState.state,
                    ease_factor: initialState.easeFactor,
                    interval_days: initialState.intervalDays,
                    repetitions: initialState.repetitions,
                    lapses: initialState.lapses,
                    due_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) {
                console.error('insertError:', insertError);
                return { success: false, error: 'Erro ao criar estado SRS' };
            }

            currentStateRow = newStateRow;
        }

        // Converter para SRSState
        const currentState: SRSState = {
            easeFactor: parseFloat(currentStateRow.ease_factor),
            intervalDays: parseFloat(currentStateRow.interval_days),
            repetitions: currentStateRow.repetitions,
            lapses: currentStateRow.lapses,
            state: currentStateRow.state as any,
        };

        // Calcular novo estado
        const newState = calculateNextReview(currentState, rating);
        const dueDate = calculateDueDate(newState.intervalDays);

        // Atualizar estado
        const { error: updateError } = await supabase
            .from('flashcard_srs_state')
            .update({
                state: newState.state,
                ease_factor: newState.easeFactor,
                interval_days: newState.intervalDays,
                repetitions: newState.repetitions,
                lapses: newState.lapses,
                due_at: dueDate.toISOString(),
                last_reviewed_at: new Date().toISOString(),
            })
            .eq('id', currentStateRow.id);

        if (updateError) {
            console.error('updateError:', updateError);
            return { success: false, error: 'Erro ao atualizar estado SRS' };
        }

        // Inserir log
        const { error: logError } = await supabase
            .from('flashcard_srs_log')
            .insert({
                user_id: user.id,
                card_id: cardId,
                deck_id: deckId,
                rating,
                quality: ratingToQuality(rating),
                previous_interval_days: currentState.intervalDays,
                previous_ease_factor: currentState.easeFactor,
                previous_state: currentState.state,
                new_interval_days: newState.intervalDays,
                new_ease_factor: newState.easeFactor,
                new_state: newState.state,
                response_time_ms: responseTimeMs,
            });

        if (logError) {
            console.error('logError:', logError);
            // Não falhar se log der erro (estado já foi atualizado)
        }

        // Revalidar cache
        revalidatePath('/revisao');
        revalidatePath(`/praticar/flashcard/${deckId}`);

        return {
            success: true,
            nextReview: dueDate,
            newInterval: newState.intervalDays
        };
    } catch (error) {
        console.error('recordReview error:', error);
        return { success: false, error: 'Erro inesperado ao registrar revisão' };
    }
}

/**
 * Obter estatísticas SRS
 */
export async function getSRSStats(deckId?: string): Promise<SRSStats> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { new: 0, learning: 0, review: 0, dueToday: 0 };
        }

        // Query base
        let query = supabase
            .from('flashcard_srs_state')
            .select('state, due_at')
            .eq('user_id', user.id);

        if (deckId) {
            query = query.eq('deck_id', deckId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('getSRSStats error:', error);
            return { new: 0, learning: 0, review: 0, dueToday: 0 };
        }

        const now = new Date();
        const stats: SRSStats = {
            new: 0,
            learning: 0,
            review: 0,
            dueToday: 0,
        };

        (data || []).forEach((row: any) => {
            // Contar por estado
            if (row.state === 'new') stats.new++;
            else if (row.state === 'learning' || row.state === 'relearning') stats.learning++;
            else if (row.state === 'review') stats.review++;

            // Contar devidos hoje
            if (new Date(row.due_at) <= now) {
                stats.dueToday++;
            }
        });

        return stats;
    } catch (error) {
        console.error('getSRSStats error:', error);
        return { new: 0, learning: 0, review: 0, dueToday: 0 };
    }
}

/**
 * Backfill: inicializar SRS para todos os cards existentes (job único)
 */
export async function backfillSRSStates(): Promise<{ success: boolean; initialized: number; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, initialized: 0, error: 'Não autenticado' };
        }

        // Buscar todos os cards do usuário que não têm estado SRS
        const { data: decks, error: decksError } = await supabase
            .from('decks')
            .select('id')
            .eq('user_id', user.id);

        if (decksError || !decks) {
            return { success: false, initialized: 0, error: 'Erro ao buscar decks' };
        }

        const deckIds = decks.map((d: { id: string }) => d.id);

        const { data: cards, error: cardsError } = await supabase
            .from('flashcards')
            .select('id, deck_id')
            .in('deck_id', deckIds);

        if (cardsError || !cards) {
            return { success: false, initialized: 0, error: 'Erro ao buscar cards' };
        }

        // Buscar estados existentes
        const { data: existingStates, error: statesError } = await supabase
            .from('flashcard_srs_state')
            .select('card_id')
            .eq('user_id', user.id);

        if (statesError) {
            return { success: false, initialized: 0, error: 'Erro ao buscar estados' };
        }

        const existingCardIds = new Set((existingStates || []).map((s: { card_id: string }) => s.card_id));

        // Filtrar cards sem estado
        const cardsToInitialize = cards.filter((c: { id: string; deck_id: string }) => !existingCardIds.has(c.id));

        if (cardsToInitialize.length === 0) {
            return { success: true, initialized: 0 };
        }

        // Criar estados iniciais
        const initialState = createInitialState();
        const statesToInsert = cardsToInitialize.map((card: { id: string; deck_id: string }) => ({
            user_id: user.id,
            card_id: card.id,
            deck_id: card.deck_id,
            state: initialState.state,
            ease_factor: initialState.easeFactor,
            interval_days: initialState.intervalDays,
            repetitions: initialState.repetitions,
            lapses: initialState.lapses,
            due_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
            .from('flashcard_srs_state')
            .insert(statesToInsert);

        if (insertError) {
            console.error('backfill insertError:', insertError);
            return { success: false, initialized: 0, error: 'Erro ao inicializar estados' };
        }

        return { success: true, initialized: statesToInsert.length };
    } catch (error) {
        console.error('backfillSRSStates error:', error);
        return { success: false, initialized: 0, error: 'Erro inesperado' };
    }
}
