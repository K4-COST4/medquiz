/**
 * API Route: Question Generation Metrics
 * 
 * Endpoint para visualizar métricas de qualidade e performance
 * do sistema de geração de questões
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Verificação de autenticação
        const authHeader = request.headers.get('authorization');
        const apiKey = request.headers.get('x-api-key');

        // Aceitar Bearer token OU API key
        const isAuthorized = authHeader?.startsWith('Bearer ') || apiKey === process.env.METRICS_API_KEY;

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Últimos 7 dias
        const since = new Date();
        since.setDate(since.getDate() - 7);

        const { data: logs, error } = await supabase
            .from('question_generation_logs')
            .select('*')
            .gte('created_at', since.toISOString());

        if (error || !logs || logs.length === 0) {
            return NextResponse.json({
                error: 'No data available',
                period: '7 days',
                total_logs: 0
            });
        }

        // 1. Hit Rate (reuso vs geração)
        const avgHitRate = logs.reduce((sum, l) => sum + (l.vector_hit_rate || 0), 0) / logs.length;
        const totalGenerated = logs.reduce((sum, l) => sum + (l.ai_generated_count || 0), 0);

        // 2. Distância média e percentis
        const distances = logs
            .map(l => l.top1_distance)
            .filter(d => d !== null && !isNaN(d));

        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

        const sortedDistances = distances.sort((a, b) => a - b);
        const p50 = sortedDistances[Math.floor(sortedDistances.length * 0.5)];
        const p95 = sortedDistances[Math.floor(sortedDistances.length * 0.95)];

        // 3. Taxa de rejeição QA
        const totalPassed = logs.reduce((sum, l) => sum + (l.validation_passed || 0), 0);
        const totalFailed = logs.reduce((sum, l) => sum + (l.validation_failed || 0), 0);
        const rejectionRate = totalFailed / (totalPassed + totalFailed || 1);

        // 4. Distribuição de dificuldade (últimos 7 dias)
        const { data: questions } = await supabase
            .from('question_bank')
            .select('difficulty')
            .gte('created_at', since.toISOString());

        const diffDistribution = {
            easy: questions?.filter(q => q.difficulty === 'easy').length || 0,
            medium: questions?.filter(q => q.difficulty === 'medium').length || 0,
            hard: questions?.filter(q => q.difficulty === 'hard').length || 0
        };

        // 5. Embedding failures
        const { count: embeddingFailures } = await supabase
            .from('question_bank')
            .select('*', { count: 'exact', head: true })
            .eq('embedding_status', 'failed');

        return NextResponse.json({
            period: '7 days',
            summary: {
                total_logs: logs.length,
                total_generated: totalGenerated,
                avg_hit_rate: (avgHitRate * 100).toFixed(1) + '%',
                qa_rejection_rate: (rejectionRate * 100).toFixed(1) + '%'
            },
            distance_metrics: {
                avg: avgDistance.toFixed(3),
                p50: p50.toFixed(3),
                p95: p95.toFixed(3),
                min: Math.min(...distances).toFixed(3),
                max: Math.max(...distances).toFixed(3),
                sample_size: distances.length
            },
            difficulty_distribution: diffDistribution,
            embedding_failures: embeddingFailures || 0,
            validation: {
                passed: totalPassed,
                failed: totalFailed,
                rejection_rate: (rejectionRate * 100).toFixed(1) + '%'
            }
        });
    } catch (error) {
        console.error('[Metrics API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
