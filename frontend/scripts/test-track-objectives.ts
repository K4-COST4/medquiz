/**
 * Test Script 1: OBJECTIVES Mode with Short Items
 * 
 * Purpose: Verify that short objectives like "Diabetes" and "ECG" are expanded properly
 * and create exactly 1 module per objective.
 * 
 * Expected Outcome:
 * - Exactly 2 modules created
 * - Module titles are expanded (not just "Diabetes")
 * - Each module has 1-7 lessons
 * - All lessons have properly structured ai_context (600-1200 chars)
 * 
 * How to Run:
 * npx tsx scripts/test-track-objectives.ts
 */

import { generateCustomTrack } from '../app/(plataform)/trilhas/custom/actions';

async function testObjectivesMode() {
    console.log('🧪 Testing OBJECTIVES Mode with Short Items\n');

    const payload = {
        mode: "OBJECTIVES" as const,
        user_input: ["Diabetes", "ECG"]
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

        // Note: To fully validate, you would need to fetch the track from database
        // and verify module count, lesson count, and ai_context structure
        console.log('\n📋 Manual verification needed:');
        console.log('1. Check database for track_id:', result.track_id);
        console.log('2. Verify exactly 2 modules exist');
        console.log('3. Verify module titles are expanded (not just "Diabetes")');
        console.log('4. Verify each module has 1-7 lessons');
        console.log('5. Verify ai_context length is 600-1200 chars');

    } catch (error) {
        console.error('❌ Test FAILED with exception:', error);
    }
}

testObjectivesMode();
