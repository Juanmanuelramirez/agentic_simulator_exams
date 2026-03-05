/**
 * Mock test script for generateQuestionsProgressive function
 * Run with: npx tsx scripts/test-progressive-generation-mock.ts
 * 
 * This test uses mocked logic and doesn't require AWS credentials.
 */

import type { Exam, BlockGenerationConfig, BlockGenerationResult, Question, GenerationResult } from '../src/types';

console.log('=== Testing generateQuestionsProgressive() Logic (Mock) ===\n');

// Create a test exam
const testExam: Exam = {
    id: 'test-exam-mock-001',
    name: 'Mock Test Exam',
    provider: 'Test Provider',
    domains: [
        { name: 'Domain A', weight: 40 },
        { name: 'Domain B', weight: 30 },
        { name: 'Domain C', weight: 30 }
    ],
    duration_minutes: 120,
    total_questions_official: 50,
    is_active: true,
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

// Create a mock question generator
function createMockQuestion(index: number, domain: string): Question {
    return {
        id: `q-mock-${index}`,
        type: 'single_select',
        domain: domain,
        question_text: `Mock question ${index} for ${domain}`,
        options: [
            { id: 'A', text: 'Option A' },
            { id: 'B', text: 'Option B' },
            { id: 'C', text: 'Option C' },
            { id: 'D', text: 'Option D' }
        ],
        correct_ids: ['A'],
        explanation: 'Mock explanation',
        why_correct: 'Mock correct explanation',
        why_incorrect: ['Mock incorrect explanation'],
        official_link: 'https://mock.test.com'
    };
}

// Mock the generate75Questions method
async function mockGenerate75Questions(totalQuestions: number): Promise<GenerationResult> {
    const questions: Question[] = [];
    for (let i = 0; i < totalQuestions; i++) {
        const domain = testExam.domains[i % testExam.domains.length].name;
        questions.push(createMockQuestion(i + 1, domain));
    }

    return {
        questions,
        stats: {
            totalGenerated: totalQuestions,
            totalFailed: 0,
            domainDistribution: new Map([
                ['Domain A', Math.ceil(totalQuestions * 0.4)],
                ['Domain B', Math.ceil(totalQuestions * 0.3)],
                ['Domain C', Math.floor(totalQuestions * 0.3)]
            ]),
            totalDuration: totalQuestions * 200,
            averageTimePerQuestion: 200
        },
        errors: []
    };
}

// Mock implementation of generateQuestionsProgressive
async function mockGenerateQuestionsProgressive(
    exam: Exam,
    config: BlockGenerationConfig
): Promise<BlockGenerationResult> {
    const { blockSize = 10, totalQuestions } = config;
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`  [Mock] Starting progressive generation: ${blockSize} in first block, ${totalQuestions} total`);

    // Step 1: Generate first block synchronously
    const firstBlockSize = Math.min(blockSize, totalQuestions);
    const firstBlockResult = await mockGenerate75Questions(firstBlockSize);

    console.log(`  [Mock] First block complete: ${firstBlockResult.stats.totalGenerated} questions`);

    // Step 2: If more questions needed, start background job
    if (totalQuestions > blockSize && !config.initialBlockOnly) {
        const remainingQuestions = totalQuestions - blockSize;
        console.log(`  [Mock] Would start background job for ${remainingQuestions} remaining questions`);

        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
            attemptId,
            firstBlock: firstBlockResult.questions,
            totalRequested: totalQuestions,
            generationStatus: 'in_progress',
            backgroundJobId: jobId
        };
    }

    // All questions generated in first block
    console.log(`  [Mock] All ${totalQuestions} questions in first block (no background job)`);

    return {
        attemptId,
        firstBlock: firstBlockResult.questions,
        totalRequested: totalQuestions,
        generationStatus: 'completed'
    };
}

async function runTests() {
    let testsPassed = 0;
    let testsFailed = 0;

    console.log('Running mock tests...\n');

    // Test 1: Small batch (all in first block)
    try {
        console.log('Test 1: Small batch (5 questions, blockSize 10)');
        const config: BlockGenerationConfig = {
            difficulty: 'intermediate',
            language: 'es',
            totalQuestions: 5,
            blockSize: 10,
            initialBlockOnly: false,
            retryAttempts: 3,
            delayBetweenRequests: 100
        };

        const result = await mockGenerateQuestionsProgressive(testExam, config);

        if (result.firstBlock.length !== 5) throw new Error(`Expected 5 questions, got ${result.firstBlock.length}`);
        if (result.totalRequested !== 5) throw new Error(`Expected totalRequested 5, got ${result.totalRequested}`);
        if (result.generationStatus !== 'completed') throw new Error(`Expected status 'completed', got ${result.generationStatus}`);
        if (result.backgroundJobId !== undefined) throw new Error(`Expected no background job, got ${result.backgroundJobId}`);

        console.log('  ✓ Test 1 passed\n');
        testsPassed++;
    } catch (error) {
        console.error(`  ✗ Test 1 failed: ${error}\n`);
        testsFailed++;
    }

    // Test 2: Large batch (requires background job)
    try {
        console.log('Test 2: Large batch (25 questions, blockSize 10)');
        const config: BlockGenerationConfig = {
            difficulty: 'intermediate',
            language: 'es',
            totalQuestions: 25,
            blockSize: 10,
            initialBlockOnly: false,
            retryAttempts: 3,
            delayBetweenRequests: 100
        };

        const result = await mockGenerateQuestionsProgressive(testExam, config);

        if (result.firstBlock.length !== 10) throw new Error(`Expected 10 questions, got ${result.firstBlock.length}`);
        if (result.totalRequested !== 25) throw new Error(`Expected totalRequested 25, got ${result.totalRequested}`);
        if (result.generationStatus !== 'in_progress') throw new Error(`Expected status 'in_progress', got ${result.generationStatus}`);
        if (!result.backgroundJobId) throw new Error(`Expected background job ID, got undefined`);
        if (!result.backgroundJobId.startsWith('job-')) throw new Error(`Invalid job ID format: ${result.backgroundJobId}`);

        console.log('  ✓ Test 2 passed\n');
        testsPassed++;
    } catch (error) {
        console.error(`  ✗ Test 2 failed: ${error}\n`);
        testsFailed++;
    }

    // Test 3: Initial block only flag
    try {
        console.log('Test 3: Initial block only (25 questions, blockSize 10, initialBlockOnly true)');
        const config: BlockGenerationConfig = {
            difficulty: 'intermediate',
            language: 'es',
            totalQuestions: 25,
            blockSize: 10,
            initialBlockOnly: true,
            retryAttempts: 3,
            delayBetweenRequests: 100
        };

        const result = await mockGenerateQuestionsProgressive(testExam, config);

        if (result.firstBlock.length !== 10) throw new Error(`Expected 10 questions, got ${result.firstBlock.length}`);
        if (result.totalRequested !== 25) throw new Error(`Expected totalRequested 25, got ${result.totalRequested}`);
        if (result.generationStatus !== 'completed') throw new Error(`Expected status 'completed', got ${result.generationStatus}`);
        if (result.backgroundJobId !== undefined) throw new Error(`Expected no background job, got ${result.backgroundJobId}`);

        console.log('  ✓ Test 3 passed\n');
        testsPassed++;
    } catch (error) {
        console.error(`  ✗ Test 3 failed: ${error}\n`);
        testsFailed++;
    }

    // Test 4: Attempt ID format
    try {
        console.log('Test 4: Attempt ID format validation');
        const config: BlockGenerationConfig = {
            difficulty: 'intermediate',
            language: 'es',
            totalQuestions: 5,
            blockSize: 10,
            initialBlockOnly: false,
            retryAttempts: 3,
            delayBetweenRequests: 100
        };

        const result = await mockGenerateQuestionsProgressive(testExam, config);

        if (!result.attemptId.match(/^att-\d+-[a-z0-9]+$/)) {
            throw new Error(`Invalid attempt ID format: ${result.attemptId}`);
        }

        console.log('  ✓ Test 4 passed\n');
        testsPassed++;
    } catch (error) {
        console.error(`  ✗ Test 4 failed: ${error}\n`);
        testsFailed++;
    }

    // Test 5: Exact blockSize boundary
    try {
        console.log('Test 5: Exact blockSize boundary (10 questions, blockSize 10)');
        const config: BlockGenerationConfig = {
            difficulty: 'intermediate',
            language: 'es',
            totalQuestions: 10,
            blockSize: 10,
            initialBlockOnly: false,
            retryAttempts: 3,
            delayBetweenRequests: 100
        };

        const result = await mockGenerateQuestionsProgressive(testExam, config);

        if (result.firstBlock.length !== 10) throw new Error(`Expected 10 questions, got ${result.firstBlock.length}`);
        if (result.generationStatus !== 'completed') throw new Error(`Expected status 'completed', got ${result.generationStatus}`);
        if (result.backgroundJobId !== undefined) throw new Error(`Expected no background job, got ${result.backgroundJobId}`);

        console.log('  ✓ Test 5 passed\n');
        testsPassed++;
    } catch (error) {
        console.error(`  ✗ Test 5 failed: ${error}\n`);
        testsFailed++;
    }

    // Summary
    console.log('=== Test Summary ===');
    console.log(`Total: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);

    if (testsFailed > 0) {
        console.log('\n✗ Some tests failed');
        process.exit(1);
    } else {
        console.log('\n✓ All tests passed!');
    }
}

// Run the tests
runTests();
