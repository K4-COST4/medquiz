/**
 * Structured Telemetry for Flashcard System
 * 
 * Emite logs JSON consistentes para monitoramento em produção.
 * Formato: { timestamp, event, component, data, duration_ms? }
 */

type LogLevel = 'info' | 'warn' | 'error' | 'metric';

interface TelemetryEvent {
    timestamp: string;
    level: LogLevel;
    component: string;
    event: string;
    data?: Record<string, any>;
    duration_ms?: number;
    error?: string;
}

function emit(event: TelemetryEvent) {
    const { level, ...rest } = event;
    const prefix = `[FLASHCARD:${level.toUpperCase()}]`;

    if (level === 'error') {
        console.error(prefix, JSON.stringify(rest));
    } else if (level === 'warn') {
        console.warn(prefix, JSON.stringify(rest));
    } else {
        console.log(prefix, JSON.stringify(rest));
    }
}

function now() {
    return new Date().toISOString();
}

// ============================================================================
// TELEMETRIA DE GERAÇÃO
// ============================================================================
export const flashcardTelemetry = {
    /** Log início de geração (unitária ou batch) */
    generationStart(params: {
        topic: string;
        amount: number;
        difficulty: string;
        hasFile: boolean;
        model: string;
    }) {
        emit({
            timestamp: now(),
            level: 'info',
            component: 'generate-cards',
            event: 'generation_start',
            data: params,
        });
    },

    /** Log resultado de geração unitária */
    generationEnd(params: {
        topic: string;
        requested: number;
        generated: number;
        duration_ms: number;
        parseMethod: 'json' | 'regex' | 'failed';
    }) {
        emit({
            timestamp: now(),
            level: 'info',
            component: 'generate-cards',
            event: 'generation_end',
            data: params,
            duration_ms: params.duration_ms,
        });
    },

    /** Log início de batch */
    batchStart(params: {
        totalAmount: number;
        batchSize: number;
        totalBatches: number;
        topic: string;
    }) {
        emit({
            timestamp: now(),
            level: 'info',
            component: 'batching',
            event: 'batch_start',
            data: params,
        });
    },

    /** Log resultado de um lote individual */
    batchResult(params: {
        batchIndex: number;
        totalBatches: number;
        generated: number;
        unique: number;
        runningTotal: number;
        retry: number;
    }) {
        emit({
            timestamp: now(),
            level: 'info',
            component: 'batching',
            event: 'batch_result',
            data: params,
        });
    },

    /** Log resultado final do batch completo */
    batchEnd(params: {
        requested: number;
        generated: number;
        fillAttempts: number;
        duration_ms: number;
        difficultyDistribution?: Record<string, number>;
    }) {
        emit({
            timestamp: now(),
            level: params.generated < params.requested ? 'warn' : 'info',
            component: 'batching',
            event: 'batch_end',
            data: params,
            duration_ms: params.duration_ms,
        });
    },

    /** Log erro estruturado */
    error(component: string, context: string, error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        emit({
            timestamp: now(),
            level: 'error',
            component,
            event: 'error',
            error: message,
            data: { context, stack },
        });
    },

    /** Log métrica numérica */
    metric(name: string, value: number, tags?: Record<string, string>) {
        emit({
            timestamp: now(),
            level: 'metric',
            component: 'metrics',
            event: name,
            data: { value, ...tags },
        });
    },

    /** Log verificação de dificuldade mista */
    difficultyCheck(params: {
        distribution: Record<string, number>;
        balanced: boolean;
        rebalanceNeeded?: string;
    }) {
        emit({
            timestamp: now(),
            level: params.balanced ? 'info' : 'warn',
            component: 'difficulty-verifier',
            event: 'difficulty_check',
            data: params,
        });
    },

    /** Log quota check */
    quotaCheck(params: {
        userId: string;
        type: string;
        allowed: boolean;
        remaining: number;
    }) {
        emit({
            timestamp: now(),
            level: params.allowed ? 'info' : 'warn',
            component: 'quota',
            event: 'quota_check',
            data: { ...params, userId: params.userId.substring(0, 8) + '...' },
        });
    },
};
