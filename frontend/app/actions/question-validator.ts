/**
 * Question Quality Validator
 * 
 * Implementa validação rigorosa de questões geradas por IA com:
 * - Severidade (critical/warning/info)
 * - Thresholds adaptativos por dificuldade
 * - Validação estrutural de commentary
 */

export interface ValidationResult {
    valid: boolean;
    issues: string[];
    severity: 'critical' | 'warning' | 'info';
}

// Limites adaptativos por dificuldade e tipo
const STATEMENT_LIMITS = {
    easy: { min: 40, max: 220 },
    medium: { min: 90, max: 450 },
    hard: { min: 90, max: 450 },
    fill_gap: { min: 30, max: 300 }
};

const COMMENTARY_MIN_LENGTH = 180;
const OPTION_MIN_LENGTH = 12;

export function validateQuestionQuality(
    question: any,
    expectedDifficulty?: string
): ValidationResult {
    const issues: string[] = [];
    let severity: 'critical' | 'warning' | 'info' = 'info';

    // Validações básicas de schema
    if (!question.statement || !question.q_type || !question.difficulty) {
        issues.push('Campos obrigatórios ausentes (statement, q_type, difficulty)');
        return { valid: false, issues, severity: 'critical' };
    }

    // Selecionar limites apropriados
    const difficulty = question.difficulty || expectedDifficulty || 'medium';
    const qType = question.q_type;

    let limits = STATEMENT_LIMITS[difficulty as keyof typeof STATEMENT_LIMITS] || STATEMENT_LIMITS.medium;
    if (qType === 'fill_gap') {
        limits = STATEMENT_LIMITS.fill_gap;
    }

    // 1. Validar tamanho do statement
    const statementLength = question.statement.length;

    if (statementLength < limits.min) {
        issues.push(
            `Statement muito curto (${statementLength} chars, mín ${limits.min} para ${difficulty})`
        );
        severity = 'critical';
    }

    if (statementLength > limits.max) {
        issues.push(
            `Statement muito longo (${statementLength} chars, máx ${limits.max})`
        );
        if (severity !== 'critical') severity = 'warning';
    }

    // 2. Validações específicas de Multiple Choice
    if (qType === 'multiple_choice') {
        const options = question.content?.options || [];

        if (options.length !== 4) {
            issues.push(`MCQ deve ter exatamente 4 alternativas (tem ${options.length})`);
            severity = 'critical';
        }

        const correctCount = options.filter((o: any) => o.isCorrect).length;
        if (correctCount !== 1) {
            issues.push(`Deve ter exatamente 1 alternativa correta (tem ${correctCount})`);
            severity = 'critical';
        }

        // Validar tamanho mínimo das opções
        const shortOptions = options.filter((o: any) => o.text?.length < OPTION_MIN_LENGTH);
        if (shortOptions.length > 0) {
            issues.push(
                `${shortOptions.length} alternativa(s) muito curta(s) (mín ${OPTION_MIN_LENGTH} chars)`
            );
            if (severity !== 'critical') severity = 'warning';
        }

        // Detectar duplicação de texto
        const texts = options.map((o: any) => o.text?.toLowerCase() || '');
        const uniqueTexts = new Set(texts);
        if (texts.length !== uniqueTexts.size) {
            issues.push('Alternativas duplicadas detectadas');
            severity = 'critical';
        }

        // Proibir "todas/nenhuma"
        const hasAllNone = options.some((o: any) =>
            /todas\s+(as\s+)?(anteriores|acima)|nenhuma\s+das\s+anteriores/i.test(o.text || '')
        );
        if (hasAllNone) {
            issues.push('Evitar "Todas as anteriores" ou "Nenhuma das anteriores"');
            if (severity !== 'critical') severity = 'warning';
        }

        // Validar IDs das opções
        const validIds = new Set(['A', 'B', 'C', 'D', 'true', 'false']);
        const invalidIds = options.filter((o: any) => !validIds.has(o.id));
        if (invalidIds.length > 0) {
            issues.push(`IDs de opções inválidos: ${invalidIds.map((o: any) => o.id).join(', ')}`);
            severity = 'critical';
        }
    }

    // 3. Validar commentary
    if (!question.commentary || question.commentary.length < COMMENTARY_MIN_LENGTH) {
        issues.push(
            `Commentary muito curto (${question.commentary?.length || 0} chars, mín ${COMMENTARY_MIN_LENGTH})`
        );
        severity = 'critical';
    }

    // Validar estrutura do commentary
    if (question.commentary) {
        const hasCorrectAnswer = /resposta\s+correta:/i.test(question.commentary);
        const hasJustification = /justificativa:/i.test(question.commentary);

        if (!hasCorrectAnswer || !hasJustification) {
            issues.push(
                'Commentary não segue template (falta "Resposta correta:" ou "Justificativa:")'
            );
            if (severity !== 'critical') severity = 'warning';
        }
    }

    // 4. Validar dificuldade esperada
    if (expectedDifficulty && question.difficulty !== expectedDifficulty) {
        issues.push(
            `Dificuldade incorreta (esperado: ${expectedDifficulty}, recebido: ${question.difficulty})`
        );
        severity = 'critical';
    }

    // 5. Proibir negativas desnecessárias (warning apenas)
    if (/exceto|não\s+é|incorret[oa]/i.test(question.statement)) {
        issues.push('Evitar negativas no enunciado (EXCETO, NÃO é, etc.)');
        // Manter severity atual (não sobrescrever critical)
    }

    // 6. Validar fill_gap específico
    if (qType === 'fill_gap') {
        if (!question.content?.correct_answer) {
            issues.push('fill_gap deve ter correct_answer');
            severity = 'critical';
        }

        const options = question.content?.options || [];
        if (options.length < 4) {
            issues.push('fill_gap deve ter pelo menos 4 opções (1 correta + 3 distratores)');
            severity = 'critical';
        }
    }

    // Política de aprovação: apenas critical reprova
    return {
        valid: severity !== 'critical',
        issues,
        severity
    };
}

/**
 * Valida um lote de questões e retorna estatísticas
 */
export function validateQuestionBatch(
    questions: any[],
    expectedDifficulties?: string[]
): {
    valid: any[];
    invalid: Array<{ question: any; validation: ValidationResult; index: number; expectedDifficulty?: string }>;
    stats: {
        total: number;
        passed: number;
        failed: number;
        warnings: number;
        criticalIssues: string[];
    };
} {
    const valid: any[] = [];
    const invalid: Array<{ question: any; validation: ValidationResult; index: number; expectedDifficulty?: string }> = [];
    const criticalIssues: string[] = [];
    let warningCount = 0;

    questions.forEach((q, idx) => {
        const expectedDiff = expectedDifficulties?.[idx];
        const result = validateQuestionQuality(q, expectedDiff);

        if (result.valid) {
            valid.push(q);
            if (result.severity === 'warning') {
                warningCount++;
            }
        } else {
            // Incluir índice e dificuldade esperada para retry correto
            invalid.push({
                question: q,
                validation: result,
                index: idx,
                expectedDifficulty: expectedDiff
            });
            criticalIssues.push(...result.issues);
        }
    });

    return {
        valid,
        invalid,
        stats: {
            total: questions.length,
            passed: valid.length,
            failed: invalid.length,
            warnings: warningCount,
            criticalIssues
        }
    };
}

