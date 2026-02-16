/**
 * Parse Commentary
 * 
 * Separa o commentary em justificativa e distratores para exibição colapsável
 */

export interface ParsedCommentary {
    justification: string;
    distractors: string;
    hasDistractors: boolean;
}

export function parseCommentary(commentary: string): ParsedCommentary {
    if (!commentary) {
        return { justification: '', distractors: '', hasDistractors: false };
    }

    // Dividir no marcador "**Por que as outras erradas:**" ou variações
    const regex = /\*\*Por que as outras (estão )?erradas?:?\*\*/i;
    const parts = commentary.split(regex);

    if (parts.length >= 2) {
        return {
            justification: parts[0].trim(),
            distractors: '**Por que as outras erradas:**\n' + parts[parts.length - 1].trim(),
            hasDistractors: true
        };
    }

    // Fallback: retornar tudo como justificativa
    return {
        justification: commentary,
        distractors: '',
        hasDistractors: false
    };
}
