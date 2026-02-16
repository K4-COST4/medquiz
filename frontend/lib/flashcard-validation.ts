import { z } from 'zod';
import { distance } from 'fastest-levenshtein';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedCard {
    front: string;
    back: string;
}

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const CardSchema = z.object({
    front: z.string()
        .min(20, 'Frente muito curta (mín 20 chars)')
        .max(500, 'Frente muito longa (máx 500 chars)'),
    back: z.string()
        .min(30, 'Verso muito curto (mín 30 chars)')
        .max(600, 'Verso muito longo (máx 600 chars)')
});

export const CardsArraySchema = z.array(CardSchema).min(1, 'Array vazio');

// ============================================================================
// FUNÇÕES DE NORMALIZAÇÃO E DEDUPE
// ============================================================================

export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isTooSimilar(text1: string, text2: string, threshold = 0.85): boolean {
    const norm1 = normalizeText(text1);
    const norm2 = normalizeText(text2);
    const maxLen = Math.max(norm1.length, norm2.length);

    if (maxLen === 0) return true;

    const dist = distance(norm1, norm2);
    const similarity = 1 - (dist / maxLen);

    return similarity > threshold;
}

// ============================================================================
// SANITIZAÇÃO (FALLBACK SEGURO)
// ============================================================================

/**
 * Escapa HTML para prevenir XSS
 * Usado como fallback seguro quando sanitização completa falha
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * IMPORTANTE: Esta função apenas valida e escapa HTML básico.
 * Sanitização completa (Markdown → HTML) deve ser feita na RENDERIZAÇÃO,
 * não no armazenamento. Salvar Markdown original no banco.
 */
export function basicSanitize(markdown: string): string {
    try {
        // Remove tags HTML perigosas
        const dangerous = /<script|<iframe|<object|<embed|onerror=|onload=/gi;
        if (dangerous.test(markdown)) {
            console.warn('⚠️ Conteúdo perigoso detectado, escapando HTML');
            return escapeHtml(markdown);
        }

        return markdown;
    } catch (error) {
        console.error('❌ Erro na sanitização básica:', error);
        return escapeHtml(markdown);
    }
}

// ============================================================================
// VALIDAÇÃO E LIMPEZA DE CARDS
// ============================================================================

export function validateAndCleanCards(rawCards: any[]): GeneratedCard[] {
    // 1. Validação Zod
    let validated: GeneratedCard[];
    try {
        validated = CardsArraySchema.parse(rawCards);
    } catch (zodError) {
        console.error('❌ Zod validation failed:', zodError);
        // Tentar filtrar apenas os válidos
        validated = rawCards.filter(card => {
            try {
                CardSchema.parse(card);
                return true;
            } catch {
                return false;
            }
        });
    }

    // 2. Remover vazios
    const nonEmpty = validated.filter(c =>
        c.front.trim().length > 0 && c.back.trim().length > 0
    );

    // 3. Dedupe
    const seen = new Set<string>();
    const unique = nonEmpty.filter(card => {
        const hash = normalizeText(card.front);
        if (seen.has(hash)) return false;
        seen.add(hash);
        return true;
    });

    // 4. Sanitização básica (salvar Markdown original, sanitizar na renderização)
    const sanitized = unique.map(card => ({
        front: basicSanitize(card.front),
        back: basicSanitize(card.back)
    }));

    // 5. Log se muitos removidos
    if (sanitized.length < rawCards.length * 0.8) {
        console.warn(`⚠️ Muitos cards removidos: ${rawCards.length} → ${sanitized.length}`);
    }

    return sanitized;
}

// ============================================================================
// JSON AUTO-REPAIR
// ============================================================================

/**
 * Extrai cards usando regex como último recurso
 */
export function extractCardsWithRegex(text: string): GeneratedCard[] {
    const frontMatches = text.matchAll(/"front"\s*:\s*"([^"]+)"/g);
    const backMatches = text.matchAll(/"back"\s*:\s*"([^"]+)"/g);

    const fronts = Array.from(frontMatches).map(m => m[1]);
    const backs = Array.from(backMatches).map(m => m[1]);

    if (fronts.length === 0) {
        throw new Error('Não foi possível extrair cards do JSON malformado');
    }

    return fronts.map((front, i) => ({
        front,
        back: backs[i] || 'Erro: verso não encontrado'
    }));
}

/**
 * Parse JSON com 3 níveis de fallback:
 * 1. Parse normal
 * 2. Extração por regex
 * 3. Erro final
 */
export function parseWithRepair(rawText: string): GeneratedCard[] {
    // Nível 1: Parse normal
    try {
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (parseError) {
        console.warn('⚠️ JSON parse failed, attempting regex extraction...', parseError);

        // Nível 2: Regex extraction
        try {
            return extractCardsWithRegex(rawText);
        } catch (regexError) {
            console.error('❌ Regex extraction failed:', regexError);
            throw new Error('Não foi possível processar o JSON retornado pela IA');
        }
    }
}
