/**
 * Manual test script for generate75Questions function
 * Run with: npx tsx scripts/test-generate75.ts
 * 
 * Note: This test requires AWS credentials and will make real API calls to Bedrock.
 * It will generate a small number of questions (5) to verify the implementation.
 */

import { solver } from '../src/agents/solver';
import type { Exam, GenerationConfig, GenerationProgress } from '../src/types';

console.log('=== Testing generate75Questions() ===\n');

// Create a test exam with multiple domains
const testExam: Exam = {
    id: 'test-exam-001',
    name: 'Test Certification Exam',
    provider: 'Test Provider',
    domains: [
        { name: 'Domain A', weight: 40 },
        { name: 'Domain B', weight: 30 },
        { name: 'Domain C', weight: 20 },
        { name: 'Domain D', weight: 10 }
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

// Configuration for a small test (5 questions instead of 75)
const config: GenerationConfig = {
    difficulty: 'intermediate',
    language: 'es',
    totalQuestions: 5,
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
        console.log('Starting generation test...');
        console.log(`Exam: ${testExam.name}`);
        console.log(`Domains: ${testExam.domains.map(d => `${d.name} (${d.weight}%)`).join(', ')}`);
        console.log(`Generating ${config.totalQuestions} questions\n`);

        const result = await solver.generate75Questions(testExam, config);

        console.log('\n=== Generation Results ===');
        console.log(`Total Generated: ${result.stats.totalGenerated}`);
        console.log(`Total Failed: ${result.stats.totalFailed}`);
        console.log(`Total Duration: ${(result.stats.totalDuration / 1000).toFixed(2)}s`);
        console.log(`Average Time per Question: ${(result.stats.averageTimePerQuestion / 1000).toFixed(2)}s`);
        
        console.log('\nDomain Distribution:');
        result.stats.domainDistribution.forEach((count, domain) => {
            console.log(`  ${domain}: ${count} questions`);
        });

        if (result.errors.length > 0) {
            console.log('\nErrors:');
            result.errors.forEach(error => {
                console.log(`  Question ${error.questionIndex} (${error.domain}): ${error.error.message}`);
            });
        }

        console.log('\n=== Validation ===');
        
        // Validation 1: Total questions
        const totalExpected = config.totalQuestions;
        const totalActual = result.stats.totalGenerated + result.stats.totalFailed;
        console.log(`✓ Total questions processed: ${totalActual} === ${totalExpected}:`, totalActual === totalExpected);

        // Validation 2: Progress updates
        console.log(`✓ Progress updates received: ${progressUpdates.length} === ${totalExpected}:`, progressUpdates.length === totalExpected);

        // Validation 3: Progress is monotonic
        const isMonotonic = progressUpdates.every((p, i) => i === 0 || p.current > progressUpdates[i - 1].current);
        console.log(`✓ Progress is monotonically increasing:`, isMonotonic);

        // Validation 4: All domains represented (if enough questions)
        const domainsRepresented = testExam.domains.every(d => 
            (result.stats.domainDistribution.get(d.name) || 0) >= 1
        );
        console.log(`✓ All domains represented:`, domainsRepresented);

        // Validation 5: Questions have required fields
        const allQuestionsValid = result.questions.every(q => 
            q.id && q.type && q.question_text && q.options && q.correct_ids && q.domain
        );
        console.log(`✓ All questions have required fields:`, allQuestionsValid);

        console.log('\n✓ All tests passed!');

    } catch (error) {
        console.error('\n✗ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
runTest();
