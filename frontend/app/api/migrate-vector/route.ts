import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/app/actions/medai-core";

// Use SERVICE_ROLE to bypass RLS and update track_questions
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    // Security Check (Simple Key via Query Param to prevent public abuse)
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("🚀 Starting Migration...");

        // 1. Fetch unmigrated questions (batch of 50 to avoid timeout)
        // We look for questions that don't have 'original_question_id' yet
        const { data: questions, error } = await supabase
            .from('track_questions')
            .select('*')
            .is('original_question_id', null)
            .limit(20); // Small batch to be safe

        if (error) throw error;
        if (!questions || questions.length === 0) {
            return NextResponse.json({ message: "No more questions to migrate.", done: true });
        }

        console.log(`Processing batch of ${questions.length} questions...`);
        let successCount = 0;

        for (const q of questions) {
            try {
                // 2. Fetch Context (Node Title) for Metadata
                const { data: node } = await supabase
                    .from('study_nodes')
                    .select('title')
                    .eq('id', q.node_id)
                    .single();

                const topic = node?.title || "General";

                // 3. Generate Embedding (Expensive Step)
                const embedding = await generateEmbedding(q.statement);

                // 4. Insert into Question Bank
                const { data: bankedQ, error: bankError } = await supabase
                    .from('question_bank')
                    .insert({
                        statement: q.statement,
                        options: q.content.options || [],
                        q_type: q.q_type,
                        difficulty: q.difficulty,
                        commentary: q.commentary,
                        topics: [topic],
                        source: 'migration_legacy',
                        embedding: embedding,
                        content: q.content // <--- CRUCIAL: Migra o JSON completo
                    })
                    .select('id')
                    .single();

                if (bankError) {
                    console.error(`Failed to insert bank Q: ${q.id}`, bankError);
                    continue;
                }

                // 5. Update Linkage (The Bridge)
                const { error: linkError } = await supabase
                    .from('track_questions')
                    .update({ original_question_id: bankedQ.id })
                    .eq('id', q.id);

                if (linkError) {
                    console.error(`Failed to link Q: ${q.id}`, linkError);
                } else {
                    successCount++;
                }

            } catch (err) {
                console.error(`Error processing Q ${q.id}:`, err);
            }
        }

        return NextResponse.json({
            message: `Batch complete. Migrated ${successCount}/${questions.length}.`,
            done: false,
            next_url: `${req.nextUrl.pathname}?key=${key}` // Hint for next batch
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
