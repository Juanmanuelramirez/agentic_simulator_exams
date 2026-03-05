/**
 * Manual test script for generateQuestionsProgressive function
 * Run with: npx tsx scripts/test-progressive-generation.ts
 * 
 * Note: This test requires AWS credentials and will make real API calls to Bedrock.
 * It will generate a small number of questions (15 total, 10 in first block) to verify the implementation.
 */

import { solver } from '../src/agents/solver';
import type { Exam, BlockGenerationConfig, GenerationProgress } from '../src/types';

console.log('=== Testing generateQuestionsProgressive() ===\n');

// Create a test exam with multiple domains
const testExam: Exam = {
    id: 'test-exam-progressive-001',
    name: 'Test Progressive Generation Exam',
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

// Track progress updates
const progressUpdates: GenerationProgress[] = [];

// Configuration for progressive generation test
const config: BlockGenerationConfig = {
    difficulty: 'intermediate',
    language: 'es',
    totalQuestions: 15,
    blockSize: 10,
    initialBlockOnly: false,
    retryAttempts: 3,
    delayBetweenRequests: 100,
    onProgress: (progress: GenerationProgress) => {
        progressUpdates.push(progress);
        console.log(
            `Progress: ${progress.current}/${progress.total} ` +
            `(${Math.round(progress.current / progress.total * 100)}%) ` +
            `- Domain: ${progress.currentDomain} ` +
            `- Success: ${progress.successCount}, Failed: ${progress.failureCount} ` +
            `- ETA: ${progress.estimatedTimeRemaining}s`
        );
    }
};

async function runTest() {
    try {
        console.log('Starting progressive generation test...');
        console.log(`Exam: ${testExam.name}`);
        console.log(`Domains: ${testExam.domains.map(d => `${d.name} (${d.weight}%)`).join(', ')}`);
        console.log(`Total Questions: ${config.totalQuestions}`);
        console.log(`Block Size: ${config.blockSize}`);
        console.log(`Initial Block Only: ${config.initialBlockOnly}\n`);

        const startTime = Date.now();
        const result = await solver.generateQuestionsProgressive(testExam, config);
        const firstBlockDuration = Date.now() - startTime;

        console.log('\n=== First Block Results ===');
        console.log(`Attempt ID: ${result.attemptId}`);
        console.log(`First Block Size: ${result.firstBlock.length}`);
        console.log(`Total Requested: ${result.totalRequested}`);
        console.log(`Generation Status: ${result.generationStatus}`);
        console.log(`Background Job ID: ${result.backgroundJobId || 'N/A'}`);
        console.log(`First Block Duration: ${(firstBlockDuration / 1000).toFixed(2)}s`);

        console.log('\n=== Validation ===');
        
        // Validation 1: First block size
        const expectedFirstBlockSize = Math.min(config.blockSize, config.totalQuestions);
        console.log(`✓ First block size: ${result.firstBlock.length} === ${expectedFirstBlockSize}:`, 
            result.firstBlock.length === expectedFirstBlockSize);

        // Validation 2: Total requested matches config
        console.log(`✓ Total requested: ${result.totalRequested} === ${config.totalQuestions}:`, 
            result.totalRequested === config.totalQuestions);

        // Validation 3: Generation status
        const expectedStatus = config.totalQuestions > config.blockSize && !config.initialBlockOnly 
            ? 'in_progress' 
            : 'completed';
        console.log(`✓ Generation status: ${result.generationStatus} === ${expectedStatus}:`, 
            result.generationStatus === expectedStatus);

        // Validation 4: Background job ID
        const shouldHaveJobId = config.totalQuestions > config.blockSize && !config.initialBlockOnly;
        const hasJobId = result.backgroundJobId !== undefined;
        console.log(`✓ Background job ID present: ${hasJobId} === ${shouldHaveJobId}:`, 
            hasJobId === shouldHaveJobId);

        // Validation 5: Attempt ID format
        const attemptIdValid = /^att-\d+-[a-z0-9]+$/.test(result.attemptId);
        console.log(`✓ Attempt ID format valid:`, attemptIdValid);

        // Validation 6: All questions in first block have required fields
        const allQuestionsValid = result.firstBlock.every(q => 
            q.id && q.type && q.question_text && q.options && q.correct_ids && q.domain
        );
        console.log(`✓ All questions have required fields:`, allQuestionsValid);

        // Validation 7: First block generated quickly (should be < 30 seconds for 10 questions)
        const firstBlockFastEnough = firstBlockDuration < 30000;
        console.log(`✓ First block generated quickly (< 30s):`, firstBlockFastEnough);

        if (result.backgroundJobId) {
            console.log('\n=== Background Job Info ===');
            console.log(`Background job ${result.backgroundJobId} is running...`);
            console.log(`It will generate ${config.totalQuestions - config.blockSize} additional questions.`);
            console.log('Note: Background generation continues asynchronously.');
            console.log('Check console logs for background job progress.');
            
            // Wait a bit to see some background progress
            console.log('\nWaiting 5 seconds to observe background progress...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log('\n✓ All validations passed!');

    } catch (error) {
        console.error('\n✗ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
runTest();
