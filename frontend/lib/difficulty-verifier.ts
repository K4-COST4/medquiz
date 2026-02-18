/**
 * Mixed Difficulty Verifier
 * 
 * Classifica flashcards por dificuldade usando heurísticas de texto 
 * e verifica se a distribuição atende ao target (30/40/30).
 */

import type { GeneratedCard } from '@/lib/flashcard-validation';

// ============================================================================
// TIPOS
// ============================================================================
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface ClassifiedCard extends GeneratedCard {
    difficulty_tag: DifficultyLevel;
}

export interface DifficultyDistribution {
    easy: number;
    medium: number;
    hard: number;
    total: number;
}

export interface VerificationResult {
    cards: ClassifiedCard[];
    distribution: DifficultyDistribution;
    balanced: boolean;
    rebalanceNeeded: DifficultyLevel | null;
}

// ============================================================================
// INDICADORES DE DIFICULDADE (Heurísticas)
// ============================================================================

// Termos que sugerem dificuldade alta
const HARD_INDICATORS = [
    'diagnóstico diferencial', 'caso clínico', 'conduta', 'manejo',
    'complicaç', 'emergência', 'prognóstico', 'paciente com',
    'qual a conduta', 'qual o tratamento de escolha', 'cirúrgic',
    'contraindicação absoluta', 'efeito adverso grave', 'choque',
    'insuficiência', 'síndrome', 'neoplasia', 'transplante',
    'ventilação mecânica', 'intubação', 'reanimação',
];

// Termos que sugerem dificuldade média (aplicação)
const MEDIUM_INDICATORS = [
    'fisiopatologia', 'mecanismo', 'qual o exame', 'interpretação',
    'classificação', 'estágio', 'qual a causa', 'etiologia',
    'farmacológic', 'dose', 'via de administração', 'indicação',
    'achados', 'alteração', 'laboratorial', 'qual a principal',
];

// Termos que sugerem dificuldade fácil (conceito direto)
const EASY_INDICATORS = [
    'definição', 'o que é', 'qual a função', 'onde se localiza',
    'componentes', 'estrutura', 'anatomia', 'histologia',
    'fisiologia básica', 'normal', 'saudável', 'conceito',
];

// ============================================================================
// CLASSIFICAÇÃO
// ============================================================================

function classifyCard(card: GeneratedCard): DifficultyLevel {
    const text = (card.front + ' ' + card.back).toLowerCase();
    const frontLength = card.front.length;

    // Pontuação por indicadores
    let hardScore = 0;
    let mediumScore = 0;
    let easyScore = 0;

    for (const term of HARD_INDICATORS) {
        if (text.includes(term)) hardScore += 2;
    }
    for (const term of MEDIUM_INDICATORS) {
        if (text.includes(term)) mediumScore += 2;
    }
    for (const term of EASY_INDICATORS) {
        if (text.includes(term)) easyScore += 2;
    }

    // Heurísticas adicionais
    // Frente longa = provavelmente cenário clínico = difícil
    if (frontLength > 150) hardScore += 3;
    else if (frontLength > 80) mediumScore += 1;
    else easyScore += 1;

    // Contagem de termos técnicos (palavras > 10 chars) na frente
    const technicalWords = card.front.split(/\s+/).filter(w => w.length > 10).length;
    if (technicalWords >= 3) hardScore += 2;
    else if (technicalWords >= 1) mediumScore += 1;

    // Back longo com explicação detalhada = médio/difícil
    if (card.back.length > 300) {
        mediumScore += 1;
        if (card.back.includes('⚠️')) hardScore += 1;
    }

    // Decidir
    if (hardScore > mediumScore && hardScore > easyScore) return 'hard';
    if (easyScore > mediumScore && easyScore > hardScore) return 'easy';
    return 'medium';
}

// ============================================================================
// VERIFICAÇÃO DE DISTRIBUIÇÃO
// ============================================================================

const TARGET_DISTRIBUTION = {
    easy: 0.40,   // 40%
    medium: 0.40, // 40%
    hard: 0.20,   // 20%
};

// Tolerância de ±15% para considerar "balanceado"
const TOLERANCE = 0.15;

export function verifyMixedDifficulty(cards: GeneratedCard[]): VerificationResult {
    const classified: ClassifiedCard[] = cards.map(card => ({
        ...card,
        difficulty_tag: classifyCard(card),
    }));

    const total = classified.length;
    const distribution: DifficultyDistribution = {
        easy: classified.filter(c => c.difficulty_tag === 'easy').length,
        medium: classified.filter(c => c.difficulty_tag === 'medium').length,
        hard: classified.filter(c => c.difficulty_tag === 'hard').length,
        total,
    };

    // Verificar se está balanceado dentro da tolerância
    let rebalanceNeeded: DifficultyLevel | null = null;
    let balanced = true;

    if (total >= 5) {
        for (const level of ['easy', 'medium', 'hard'] as DifficultyLevel[]) {
            const actual = distribution[level] / total;
            const target = TARGET_DISTRIBUTION[level];

            if (actual < target - TOLERANCE) {
                balanced = false;
                // Encontra a dificuldade mais subrepresentada
                if (!rebalanceNeeded || (distribution[level] / total) < (distribution[rebalanceNeeded] / total)) {
                    rebalanceNeeded = level;
                }
            }
        }
    }

    return {
        cards: classified,
        distribution,
        balanced,
        rebalanceNeeded,
    };
}

/**
 * Gera instrução de prompt focando na dificuldade que falta
 */
export function getRebalanceInstruction(level: DifficultyLevel): string {
    switch (level) {
        case 'easy':
            return 'Gere cards de nível FÁCIL: conceitos básicos, terminologia, anatomia/fisiologia fundamental. Sem cenários complexos.';
        case 'medium':
            return 'Gere cards de nível MÉDIO: aplicação de conceitos, fisiopatologia, interpretação de exames, indicações. Um passo além do básico.';
        case 'hard':
            return 'Gere cards de nível DIFÍCIL: casos clínicos complexos, diagnóstico diferencial, conduta emergencial, complicações raras. Nível residência.';
    }
}
