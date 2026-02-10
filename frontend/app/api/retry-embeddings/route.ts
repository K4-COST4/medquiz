/**
 * API Route: Retry Failed Embeddings
 * 
 * Job para reprocessar questões com falha na vetorização
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { generateEmbedding } from '@/app/actions/medai-core';

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

        // Buscar questões com falha
        const { data: failedQuestions, error } = await supabase
            .from('question_bank')
            .select('id, statement')
            .eq('embedding_status', 'failed')
            .limit(50);

        if (error || !failedQuestions || failedQuestions.length === 0) {
            return NextResponse.json({
                message: 'No failed embeddings to retry',
                retried: 0,
                total: 0
            });
        }

        let retried = 0;
        const errors: string[] = [];

        for (const q of failedQuestions) {
            try {
                const vec = await generateEmbedding(q.statement);

                await supabase
                    .from('question_bank')
                    .update({
                        embedding: vec,
                        embedding_status: 'completed'
                    })
                    .eq('id', q.id);

                retried++;
            } catch (err) {
                console.error(`[Retry] Failed for question ${q.id}:`, err);
                errors.push(q.id);
            }
        }

        return NextResponse.json({
            message: `Retried ${retried} out of ${failedQuestions.length} failed embeddings`,
            retried,
            total: failedQuestions.length,
            failed: errors.length,
            failed_ids: errors
        });
    } catch (error) {
        console.error('[Retry Embeddings API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
