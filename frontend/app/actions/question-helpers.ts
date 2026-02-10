/**
 * Helper Functions for Question Generation Service
 * 
 * Funções auxiliares para enriquecimento de queries, reranking e hierarquia
 */

/**
 * Constrói query enriquecida com ai_context
 */
export function buildEnrichedQuery(node: any, parentNode: any | null): string {
    let query = `${node.title}`;

    if (parentNode?.title) {
        query += ` (${parentNode.title})`;
    }

    if (!node.ai_context || node.ai_context.length < 100) {
        return query.substring(0, 800);
    }

    const context = node.ai_context;

    // Tentativa 1: Regex estruturado com variações (sem flag 's' para compatibilidade)
    const objectiveMatch = context.match(/OBJETIVO[:\s]*(.+?)(?:\n|CONTE[ÚU]DO|RED FLAGS|$)/i);
    const essentialMatch = context.match(/CONTE[ÚU]DO\s+ESSENCIAL[:\s]*((?:[-•*]\s*.+?\n?){1,4})/i);
    const redFlagsMatch = context.match(/RED\s+FLAGS?[^:]*[:\s]*((?:[-•*]\s*.+?\n?){1,2})/i);

    if (objectiveMatch) {
        query += ` | OBJETIVO: ${objectiveMatch[1].trim().substring(0, 100)}`;
    }

    if (essentialMatch) {
        const bullets = essentialMatch[1]
            .split('\n')
            .filter((l: string) => /^[-•*]\s/.test(l.trim()))
            .slice(0, 3)
            .map((l: string) => l.replace(/^[-•*]\s*/, '').trim())
            .join('; ');
        query += ` | ESSENCIAL: ${bullets}`;
    }

    if (redFlagsMatch) {
        const flags = redFlagsMatch[1]
            .split('\n')
            .filter((l: string) => l.trim())
            .slice(0, 2)
            .map((l: string) => l.replace(/^[-•*]\s*/, '').trim())
            .join('; ');
        query += ` | RED FLAGS: ${flags}`;
    }

    // Fallback: Se regex falhou
    if (!objectiveMatch && !essentialMatch) {
        const lines = context.split('\n').filter((l: string) => l.trim().length > 20);
        if (lines.length > 0) {
            query += ` | OBJETIVO: ${lines[0].substring(0, 100)}`;
        }

        const bullets = context
            .split('\n')
            .filter((l: string) => /^[-•*]\s/.test(l.trim()))
            .slice(0, 3)
            .map((l: string) => l.replace(/^[-•*]\s*/, '').trim());

        if (bullets.length > 0) {
            query += ` | ESSENCIAL: ${bullets.join('; ')}`;
        }
    }

    return query.substring(0, 800);
}

/**
 * Reranking simples baseado em keywords
 */
export function rerankMatches(
    matches: any[],
    keywords: string[],
    node: any
): any[] {
    const topicKeywords = new Set([
        ...keywords,
        ...node.title.toLowerCase().split(/\s+/),
        ...(node.parent?.title?.toLowerCase().split(/\s+/) || [])
    ]);

    const scored = matches.map(match => {
        const statementLower = match.statement.toLowerCase();

        let keywordScore = 0;
        topicKeywords.forEach(kw => {
            if (kw.length > 3 && statementLower.includes(kw)) {
                keywordScore += 1;
            }
        });

        const normalizedKeywordScore = keywordScore / Math.sqrt(match.statement.length / 100);

        // Normalização segura (sempre funciona)
        const distanceScore = 1 / (1 + (match.distance || 0));

        const finalScore = (0.7 * distanceScore) + (0.3 * normalizedKeywordScore);

        return {
            ...match,
            rerank_score: finalScore,
            keyword_matches: keywordScore,
            distance_score: distanceScore
        };
    });

    return scored.sort((a, b) => b.rerank_score - a.rerank_score);
}

/**
 * Estratégia de seleção dinâmica baseada em distance
 */
export function selectMatchStrategy(
    matches: any[],
    difficultyNeeded: string
): 'reuse' | 'generate' {
    if (!matches || matches.length === 0) return 'generate';

    const top1 = matches[0];

    // Critérios baseados em dados (ajustar após Fase 0)
    const EXCELLENT_THRESHOLD = 0.12;
    const GOOD_THRESHOLD = 0.20;

    // Se top1 é excelente E tem a dificuldade certa, reuse
    if (top1.distance < EXCELLENT_THRESHOLD && top1.difficulty === difficultyNeeded) {
        return 'reuse';
    }

    // Se top1 é bom E rerank_score alto, reuse
    if (top1.distance < GOOD_THRESHOLD && top1.rerank_score > 0.7) {
        return 'reuse';
    }

    return 'generate';
}

/**
 * Busca hierarquia completa do nó
 */
export async function fetchNodeHierarchy(supabase: any, nodeId: string) {
    const { data: node } = await supabase
        .from('study_nodes')
        .select('id, title, parent_id, node_type')
        .eq('id', nodeId)
        .single();

    if (!node) return {};

    let parent = null;
    let track = null;

    if (node.parent_id) {
        const { data: parentNode } = await supabase
            .from('study_nodes')
            .select('id, title, parent_id')
            .eq('id', node.parent_id)
            .single();

        parent = parentNode;

        if (parentNode?.parent_id) {
            const { data: trackNode } = await supabase
                .from('study_nodes')
                .select('id, title')
                .eq('id', parentNode.parent_id)
                .single();

            track = trackNode;
        }
    }

    return { node, parent, track };
}
