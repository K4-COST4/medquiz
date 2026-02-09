/**
 * Test Script 4: Payload Validation
 * 
 * Purpose: Verify that invalid payloads are rejected with clear errors.
 * 
 * Test Cases:
 * 1. Invalid mode
 * 2. OBJECTIVES with string (should be array)
 * 3. FREE_TEXT with array (should be string)
 * 4. Empty user_input
 * 
 * Expected Outcome: All cases return validation errors with clear messages.
 * 
 * How to Run:
 * npx tsx scripts/test-payload-validation.ts
 */

import { generateCustomTrack } from '../app/(plataform)/trilhas/custom/actions';

async function testCase(name: string, payload: any) {
    console.log(`\n🧪 Test Case: ${name}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const result = await generateCustomTrack(payload);

        if (result.success) {
            console.log('❌ FAILED: Should have been rejected but succeeded');
        } else {
            console.log('✅ PASSED: Correctly rejected');
            console.log('Error message:', result.message);
        }
    } catch (error: any) {
        console.log('✅ PASSED: Correctly rejected with exception');
        console.log('Error:', error.message);
    }
}

async function testPayloadValidation() {
    console.log('🧪 Testing Payload Validation\n');
    console.log('='.repeat(60));

    // Test Case 1: Invalid mode
    await testCase('Invalid mode', {
        mode: "INVALID",
        user_input: ["test"]
    });

    // Test Case 2: OBJECTIVES with string (should be array)
    await testCase('OBJECTIVES with string', {
        mode: "OBJECTIVES",
        user_input: "test"
    });

    // Test Case 3: FREE_TEXT with array (should be string)
    await testCase('FREE_TEXT with array', {
        mode: "FREE_TEXT",
        user_input: ["test"]
    });

    // Test Case 4: Empty user_input (OBJECTIVES)
    await testCase('Empty OBJECTIVES array', {
        mode: "OBJECTIVES",
        user_input: []
    });

    // Test Case 5: Empty user_input (FREE_TEXT)
    await testCase('Empty FREE_TEXT string', {
        mode: "FREE_TEXT",
        user_input: ""
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All validation tests completed!');
}

testPayloadValidation();
