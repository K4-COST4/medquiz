/**
 * Validation Test Suite: Lesson Quantity After Prompt Update
 * 
 * Purpose: Validate that the new prompt generates appropriate lesson quantities
 * based on objective criteria instead of conservative bias.
 * 
 * Expected Results:
 * - Diseases: 4-6 lessons
 * - Exams: 3-4 lessons
 * - Procedures: 2-3 lessons
 * - Broad areas: 6-8 lessons
 * 
 * How to Run:
 * npx tsx scripts/validate-lesson-quantity.ts
 */

import { generateCustomTrack } from '../app/(plataform)/trilhas/custom/actions';

interface TestCase {
    name: string;
    payload: any;
    expectedModules: {
        name: string;
        minLessons: number;
        maxLessons: number;
        category: string;
    }[];
}

const testCases: TestCase[] = [
    {
        name: "Test 1: OBJECTIVES - Common Diseases",
        payload: {
            mode: "OBJECTIVES",
            user_input: ["Diabetes Mellitus", "Hipertensão Arterial", "Técnica de Venopunção"]
        },
        expectedModules: [
            { name: "Diabetes Mellitus", minLessons: 4, maxLessons: 6, category: "DOENÇA" },
            { name: "Hipertensão Arterial", minLessons: 4, maxLessons: 6, category: "DOENÇA" },
            { name: "Técnica de Venopunção", minLessons: 2, maxLessons: 3, category: "PROCEDIMENTO" }
        ]
    },
    {
        name: "Test 2: OBJECTIVES - Exam",
        payload: {
            mode: "OBJECTIVES",
            user_input: ["ECG"]
        },
        expectedModules: [
            { name: "ECG", minLessons: 3, maxLessons: 4, category: "EXAME" }
        ]
    },
    {
        name: "Test 3: OBJECTIVES - Broad Area",
        payload: {
            mode: "OBJECTIVES",
            user_input: ["Cardiologia básica"]
        },
        expectedModules: [
            { name: "Cardiologia básica", minLessons: 6, maxLessons: 8, category: "ÁREA AMPLA" }
        ]
    },
    {
        name: "Test 4: FREE_TEXT - Multiple Topics",
        payload: {
            mode: "FREE_TEXT",
            user_input: "Quero aprender sobre Insuficiência Cardíaca, incluindo fisiopatologia, diagnóstico e tratamento. Também preciso entender Hipertensão Arterial e suas complicações."
        },
        expectedModules: [
            { name: "Insuficiência Cardíaca", minLessons: 5, maxLessons: 7, category: "DOENÇA (completa)" },
            { name: "Hipertensão Arterial", minLessons: 4, maxLessons: 6, category: "DOENÇA" }
        ]
    }
];

async function runTest(testCase: TestCase): Promise<boolean> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 ${testCase.name}`);
    console.log(`${'='.repeat(80)}\n`);

    console.log('📤 Payload:', JSON.stringify(testCase.payload, null, 2));

    try {
        const result = await generateCustomTrack(testCase.payload);

        if (!result.success) {
            console.error('❌ FAILED: Track generation failed');
            console.error('Error:', result.message);
            return false;
        }

        console.log('\n✅ Track created successfully!');
        console.log('Track ID:', result.track_id);

        console.log('\n📋 VALIDATION REQUIRED (Manual):');
        console.log('Please check the database and verify:');
        console.log('');

        testCase.expectedModules.forEach((expected, index) => {
            console.log(`Module ${index + 1}: ${expected.name}`);
            console.log(`  Category: ${expected.category}`);
            console.log(`  Expected lessons: ${expected.minLessons}-${expected.maxLessons}`);
            console.log(`  ✓ Check: Module has at least ${expected.minLessons} lessons`);
            console.log(`  ✓ Check: Module has at most ${expected.maxLessons} lessons`);
            console.log('');
        });

        return true;

    } catch (error) {
        console.error('❌ FAILED: Exception thrown');
        console.error('Error:', error);
        return false;
    }
}

async function runAllTests() {
    console.log('\n🚀 Starting Lesson Quantity Validation Tests');
    console.log('='.repeat(80));

    const results: boolean[] = [];

    for (const testCase of testCases) {
        const passed = await runTest(testCase);
        results.push(passed);

        // Wait 2 seconds between tests to avoid rate limiting
        if (testCase !== testCases[testCases.length - 1]) {
            console.log('\n⏳ Waiting 2 seconds before next test...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const passedCount = results.filter(r => r).length;
    const totalCount = results.length;

    console.log(`\nTests passed: ${passedCount}/${totalCount}`);

    if (passedCount === totalCount) {
        console.log('\n✅ ALL TESTS PASSED!');
        console.log('\nNext steps:');
        console.log('1. Manually verify lesson counts in database');
        console.log('2. Check ai_context length (should be 600-1200 chars)');
        console.log('3. Verify JSON structure is valid');
        console.log('4. Monitor first production generations');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED');
        console.log('\nPlease review the errors above and adjust the prompt if needed.');
    }
}

runAllTests();
