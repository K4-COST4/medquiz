'use server'

import type { GeneratedCard } from '@/lib/flashcard-validation';
import { generateFlashcardsAI } from './generate-cards';
import { validateAndCleanCards, isTooSimilar } from '@/lib/flashcard-validation';
import { checkQuota, consumeQuota } from '@/lib/quota';
import { flashcardTelemetry } from '@/lib/telemetry';
import { verifyMixedDifficulty, getRebalanceInstruction } from '@/lib/difficulty-verifier';
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// BATCHING COM FILL-TO-TARGET + DIFFICULTY VERIFICATION (Server Action)
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
 * Server Action: Gera flashcards em lotes com retry, fill-to-target,
 * e verificação de dificuldade mista.
 */
export async function generateInBatches(
    totalAmount: number,
    config: BatchingConfig
): Promise<{ cards: GeneratedCard[], generated: number, total: number }> {
    const BATCH_SIZE = 10;
    const MAX_RETRIES_PER_BATCH = 2;
    const MAX_FILL_ATTEMPTS = 3;
    const batchStartTime = Date.now();

    // ========================================================================
    // AUTH + QUOTA CHECK (1x centralizada)
    // ========================================================================
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autorizado.");

    const quotaResult = await checkQuota(user.id, 'flashcard');
    flashcardTelemetry.quotaCheck({
        userId: user.id,
        type: 'flashcard',
        allowed: quotaResult.allowed,
        remaining: quotaResult.remaining,
    });

    if (!quotaResult.allowed) {
        return { cards: [], generated: 0, total: totalAmount };
    }

    // ========================================================================
    // TELEMETRIA: Início
    // ========================================================================
    const totalBatches = Math.ceil(totalAmount / BATCH_SIZE);
    flashcardTelemetry.batchStart({
        totalAmount,
        batchSize: BATCH_SIZE,
        totalBatches,
        topic: config.topic,
    });

    // ========================================================================
    // FASE 1: Gerar lotes principais
    // ========================================================================
    const allCards: GeneratedCard[] = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchSize = Math.min(BATCH_SIZE, totalAmount - allCards.length);
        let batchSuccess = false;

        for (let retry = 0; retry < MAX_RETRIES_PER_BATCH && !batchSuccess; retry++) {
            try {
                const antiDupeContext = allCards.length > 0
                    ? `\n\nIMPORTANTE: Evite repetir estes tópicos já cobertos:\n${allCards.slice(-10).map(c => '- ' + c.front.substring(0, 60)).join('\n')}`
                    : '';

                const result = await generateFlashcardsAI({
                    ...config,
                    amount: batchSize,
                    details: (config.details || '') + antiDupeContext,
                    skipQuota: true, // Quota gerenciada aqui
                });

                if (result.success && result.cards) {
                    const validated = validateAndCleanCards(result.cards);
                    const newUnique = validated.filter(newCard =>
                        !allCards.some(existing => isTooSimilar(existing.front, newCard.front))
                    );

                    if (newUnique.length > 0) {
                        allCards.push(...newUnique);
                        batchSuccess = true;

                        flashcardTelemetry.batchResult({
                            batchIndex: batchIndex + 1,
                            totalBatches,
                            generated: validated.length,
                            unique: newUnique.length,
                            runningTotal: allCards.length,
                            retry,
                        });
                    }
                }
            } catch (error) {
                flashcardTelemetry.error('batching', `batch_${batchIndex + 1}_retry_${retry + 1}`, error);
            }
        }
    }

    // ========================================================================
    // FASE 2: Fill-to-target
    // ========================================================================
    let fillAttempt = 0;
    while (allCards.length < totalAmount && fillAttempt < MAX_FILL_ATTEMPTS) {
        const needed = totalAmount - allCards.length;
        const fillSize = Math.min(BATCH_SIZE, needed);

        flashcardTelemetry.metric('fill_attempt', fillAttempt + 1, { needed: String(needed) });

        try {
            const antiDupeContext = `\n\nCRÍTICO: Evite COMPLETAMENTE repetir estes tópicos:\n${allCards.slice(-20).map(c => '- ' + c.front.substring(0, 60)).join('\n')}`;

            const result = await generateFlashcardsAI({
                ...config,
                amount: fillSize,
                details: (config.details || '') + antiDupeContext,
                skipQuota: true,
            });

            if (result.success && result.cards) {
                const validated = validateAndCleanCards(result.cards);
                const newUnique = validated.filter(newCard =>
                    !allCards.some(existing => isTooSimilar(existing.front, newCard.front))
                );

                if (newUnique.length > 0) {
                    allCards.push(...newUnique);
                } else {
                    break; // Evitar loop infinito se só gera duplicatas
                }
            }
        } catch (error) {
            flashcardTelemetry.error('batching', `fill_attempt_${fillAttempt + 1}`, error);
        }

        fillAttempt++;
    }

    // ========================================================================
    // FASE 3: Verificação de dificuldade mista (post-processing)
    // ========================================================================
    let difficultyDistribution: Record<string, number> | undefined;

    if (config.difficulty === 'mixed' && allCards.length >= 5) {
        const verification = verifyMixedDifficulty(allCards);
        difficultyDistribution = {
            easy: verification.distribution.easy,
            medium: verification.distribution.medium,
            hard: verification.distribution.hard,
        };

        flashcardTelemetry.difficultyCheck({
            distribution: difficultyDistribution,
            balanced: verification.balanced,
            rebalanceNeeded: verification.rebalanceNeeded || undefined,
        });

        // Se desbalanceado E temos espaço para mais cards, gera 1 lote extra focado
        if (!verification.balanced && verification.rebalanceNeeded && allCards.length < totalAmount + BATCH_SIZE) {
            try {
                const rebalanceInstruction = getRebalanceInstruction(verification.rebalanceNeeded);
                const neededForBalance = Math.min(BATCH_SIZE, Math.max(3, Math.ceil(totalAmount * 0.2)));

                const result = await generateFlashcardsAI({
                    ...config,
                    amount: neededForBalance,
                    details: (config.details || '') + `\n\nINSTRUÇÃO ESPECIAL: ${rebalanceInstruction}`,
                    skipQuota: true,
                });

                if (result.success && result.cards) {
                    const validated = validateAndCleanCards(result.cards);
                    const newUnique = validated.filter(newCard =>
                        !allCards.some(existing => isTooSimilar(existing.front, newCard.front))
                    );
                    if (newUnique.length > 0) {
                        allCards.push(...newUnique);
                        flashcardTelemetry.metric('rebalance_added', newUnique.length, {
                            targetDifficulty: verification.rebalanceNeeded,
                        });
                    }
                }
            } catch (error) {
                flashcardTelemetry.error('batching', 'rebalance_attempt', error);
            }
        }
    }

    // ========================================================================
    // QUOTA CONSUME (1x após sucesso)
    // ========================================================================
    if (allCards.length > 0) {
        await consumeQuota(user.id, 'flashcard');
    }

    // ========================================================================
    // RESULTADO FINAL + TELEMETRIA
    // ========================================================================
    const finalCards = allCards.slice(0, totalAmount);
    const duration = Date.now() - batchStartTime;

    flashcardTelemetry.batchEnd({
        requested: totalAmount,
        generated: finalCards.length,
        fillAttempts: fillAttempt,
        duration_ms: duration,
        difficultyDistribution,
    });

    return { cards: finalCards, generated: finalCards.length, total: totalAmount };
}
