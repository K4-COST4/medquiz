/**
 * Algoritmo SM-2 (SuperMemo 2) para Spaced Repetition System
 * Referência: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SRSState {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    lapses: number;
    state: 'new' | 'learning' | 'review' | 'relearning';
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Mapear rating Anki-style para quality SM-2
 */
export function ratingToQuality(rating: SRSRating): 1 | 3 | 4 | 5 {
    const mapping: Record<SRSRating, 1 | 3 | 4 | 5> = {
        again: 1, // Falha total
        hard: 3,  // Difícil, progresso leve
        good: 4,  // Padrão, bom progresso
        easy: 5,  // Fácil, grande progresso
    };
    return mapping[rating];
}

/**
 * Calcular próximo estado SRS baseado no algoritmo SM-2
 */
export function calculateNextReview(
    currentState: SRSState,
    rating: SRSRating
): SRSState {
    const quality = ratingToQuality(rating);
    const newState = { ...currentState };

    // Again (quality 1): Reset completo
    if (quality === 1) {
        newState.intervalDays = 1;
        newState.repetitions = 0;
        newState.lapses++;
        newState.state = newState.lapses > 0 ? 'relearning' : 'learning';
        return newState;
    }

    // Hard/Good/Easy (quality 3/4/5): Progressão
    if (newState.repetitions === 0) {
        // Primeira revisão: 1 dia
        newState.intervalDays = 1;
    } else if (newState.repetitions === 1) {
        // Segunda revisão: 6 dias
        newState.intervalDays = 6;
    } else {
        // Revisões subsequentes: multiplicar pelo ease factor
        newState.intervalDays = Math.round(newState.intervalDays * newState.easeFactor);
    }

    newState.repetitions++;

    // Ajustar ease factor baseado na qualidade
    // Fórmula SM-2: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    newState.easeFactor = Math.max(1.3, newState.easeFactor + efDelta);

    // Atualizar estado baseado no intervalo
    if (newState.intervalDays >= 21) {
        newState.state = 'review';
    } else {
        newState.state = 'learning';
    }

    return newState;
}

/**
 * Calcular data da próxima revisão
 */
export function calculateDueDate(intervalDays: number): Date {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Math.ceil(intervalDays));
    return dueDate;
}

/**
 * Formatar intervalo para exibição
 */
export function formatInterval(intervalDays: number): string {
    if (intervalDays < 1) {
        const minutes = Math.round(intervalDays * 24 * 60);
        return `${minutes}min`;
    } else if (intervalDays === 1) {
        return '1 dia';
    } else if (intervalDays < 30) {
        return `${Math.round(intervalDays)} dias`;
    } else if (intervalDays < 365) {
        const months = Math.round(intervalDays / 30);
        return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    } else {
        const years = Math.round(intervalDays / 365);
        return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
}

/**
 * Criar estado inicial para card novo
 */
export function createInitialState(): SRSState {
    return {
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        lapses: 0,
        state: 'new',
    };
}
