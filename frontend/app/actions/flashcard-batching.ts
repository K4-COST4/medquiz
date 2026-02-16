'use server'

import type { GeneratedCard } from '@/lib/flashcard-validation';
import { generateFlashcardsAI } from './generate-cards';
import { validateAndCleanCards, isTooSimilar } from '@/lib/flashcard-validation';
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// BATCHING COM FILL-TO-TARGET (Server Action)
// ============================================================================

export interface BatchingConfig {
    topic: string;
    details?: string;
    references?: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    fileBase64?: string;
    deckId?: string;
}

/**
 * Server Action: Gera flashcards em lotes com retry e fill-to-target.
 * 
 * NOTA: Como Server Actions não suportam callbacks (onProgress) nem AbortSignal,
 * esta função faz tudo no servidor e retorna o resultado completo.
 * 
 * CORREÇÃO: Quota é gerenciada AQUI (1x), não por lote.
 */
export async function generateInBatches(
    totalAmount: number,
    config: BatchingConfig
): Promise<{ cards: GeneratedCard[], generated: number, total: number }> {
    const BATCH_SIZE = 10;
    const MAX_RETRIES_PER_BATCH = 2;
    const MAX_FILL_ATTEMPTS = 3;

    // ========================================================================
    // QUOTA CHECK (1x antes de tudo)
    // ========================================================================
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autorizado.");

    const today = new Date().toISOString().split('T')[0];
    const { data: profile } = await supabase
        .from('profiles')
        .select('daily_flashcards_count, ai_usage_date')
        .eq('id', user.id)
        .single();

    if (profile) {
        let flashCount = 0;
        if (profile.ai_usage_date === today) {
            flashCount = profile.daily_flashcards_count || 0;
        }
        if (flashCount >= 1) {
            return { cards: [], generated: 0, total: totalAmount };
        }
    }

    // ========================================================================
    // FASE 1: Gerar lotes principais (skipQuota=true para todos)
    // ========================================================================
    const allCards: GeneratedCard[] = [];
    const totalBatches = Math.ceil(totalAmount / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchSize = Math.min(BATCH_SIZE, totalAmount - allCards.length);
        let batchSuccess = false;

        // Retry por lote (não global)
        for (let retry = 0; retry < MAX_RETRIES_PER_BATCH && !batchSuccess; retry++) {
            try {
                // Anti-duplicata context
                const antiDupeContext = allCards.length > 0
                    ? `\n\nIMPORTANTE: Evite repetir estes tópicos já cobertos:\n${allCards.slice(-10).map(c => '- ' + c.front.substring(0, 60)).join('\n')}`
                    : '';

                const result = await generateFlashcardsAI({
                    ...config,
                    amount: batchSize,
                    details: (config.details || '') + antiDupeContext,
                    skipQuota: true // Quota gerenciada aqui no nível do batching
                });

                if (result.success && result.cards) {
                    const validated = validateAndCleanCards(result.cards);

                    // Filtrar duplicatas com cards existentes
                    const newUnique = validated.filter(newCard =>
                        !allCards.some(existing =>
                            isTooSimilar(existing.front, newCard.front)
                        )
                    );

                    if (newUnique.length > 0) {
                        allCards.push(...newUnique);
                        batchSuccess = true;
                        console.log(`✅ Lote ${batchIndex + 1}/${totalBatches}: +${newUnique.length} cards (total: ${allCards.length})`);
                    }
                }

            } catch (error) {
                console.error(`❌ Lote ${batchIndex + 1}, tentativa ${retry + 1} falhou:`, error);

                if (retry === MAX_RETRIES_PER_BATCH - 1) {
                    console.warn(`⚠️ Lote ${batchIndex + 1} falhou após ${MAX_RETRIES_PER_BATCH} tentativas`);
                }
            }
        }
    }

    // ========================================================================
    // FASE 2: Fill-to-target se necessário
    // ========================================================================
    let fillAttempt = 0;
    while (allCards.length < totalAmount && fillAttempt < MAX_FILL_ATTEMPTS) {
        const needed = totalAmount - allCards.length;
        const fillSize = Math.min(BATCH_SIZE, needed);

        console.log(`🔄 Fill attempt ${fillAttempt + 1}: need ${needed} more cards`);

        try {
            const antiDupeContext = `\n\nCRÍTICO: Evite COMPLETAMENTE repetir estes tópicos:\n${allCards.slice(-20).map(c => '- ' + c.front.substring(0, 60)).join('\n')}`;

            const result = await generateFlashcardsAI({
                ...config,
                amount: fillSize,
                details: (config.details || '') + antiDupeContext,
                skipQuota: true // Quota gerenciada aqui
            });

            if (result.success && result.cards) {
                const validated = validateAndCleanCards(result.cards);
                const newUnique = validated.filter(newCard =>
                    !allCards.some(existing =>
                        isTooSimilar(existing.front, newCard.front)
                    )
                );

                if (newUnique.length > 0) {
                    allCards.push(...newUnique);
                } else {
                    console.warn('⚠️ Fill gerou apenas duplicatas');
                    break; // Evitar loop infinito
                }
            }

        } catch (error) {
            console.error(`❌ Fill attempt ${fillAttempt + 1} falhou:`, error);
        }

        fillAttempt++;
    }

    // ========================================================================
    // QUOTA INCREMENT (1x depois de tudo)
    // ========================================================================
    if (allCards.length > 0 && profile) {
        const updates: any = { ai_usage_date: today };
        const currentFlash = (profile.ai_usage_date === today) ? (profile.daily_flashcards_count || 0) : 0;
        updates.daily_flashcards_count = currentFlash + 1;
        if (profile.ai_usage_date !== today) updates.ai_usage_count = 0;

        await supabase.from('profiles').update(updates).eq('id', user.id);
    }

    // ========================================================================
    // RESULTADO FINAL
    // ========================================================================
    const finalCards = allCards.slice(0, totalAmount);

    if (finalCards.length < totalAmount) {
        console.warn(`⚠️ Gerados ${finalCards.length}/${totalAmount} após todas as tentativas`);
    } else {
        console.log(`✅ Gerados ${finalCards.length}/${totalAmount} cards com sucesso`);
    }

    return { cards: finalCards, generated: finalCards.length, total: totalAmount };
}
