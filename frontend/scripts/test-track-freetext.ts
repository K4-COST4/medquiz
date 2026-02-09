/**
 * Test Script 2: FREE_TEXT Mode with Mixed Topics
 * 
 * Purpose: Verify that free text input is grouped logically into modules.
 * 
 * Expected Outcome:
 * - Logical grouping (likely 2 modules: IC and HAS)
 * - Lessons are sequential and non-redundant
 * - Total lessons follow quantity rules (1-7 per module)
 * 
 * How to Run:
 * npx tsx scripts/test-track-freetext.ts
 */

import { generateCustomTrack } from '../app/(plataform)/trilhas/custom/actions';

async function testFreeTextMode() {
    console.log('🧪 Testing FREE_TEXT Mode with Mixed Topics\n');

    const payload = {
        mode: "FREE_TEXT" as const,
        user_input: "Quero aprender sobre Insuficiência Cardíaca, incluindo fisiopatologia, diagnóstico e tratamento. Também preciso entender Hipertensão Arterial e suas complicações."
    };

    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

    try {
        const result = await generateCustomTrack(payload);

        if (!result.success) {
            console.error('❌ Test FAILED:', result.message);
            return;
        }

        console.log('\n✅ Track created successfully!');
        console.log('Track ID:', result.track_id);

        console.log('\n📋 Manual verification needed:');
        console.log('1. Check database for track_id:', result.track_id);
        console.log('2. Verify logical grouping (likely 2 modules)');
        console.log('3. Verify lessons are sequential and non-redundant');
        console.log('4. Verify lesson count per module is 1-7');
        console.log('5. Verify ai_context length is 600-1200 chars');

    } catch (error) {
        console.error('❌ Test FAILED with exception:', error);
    }
}

testFreeTextMode();
