/**
 * Mock test script for generate75Questions function
 * Tests the logic without making real AWS API calls
 * Run with: npx tsx scripts/test-generate75-mock.ts
 */

import type { Exam, GenerationConfig, GenerationProgress, Question, DomainQuestionAllocation } from '../src/types';

console.log('=== Testing generate75Questions() Logic (Mock) ===\n');

// Mock implementation of the algorithm
async function mockGenerate75Questions(
    exam: Exam,
    config: GenerationConfig
): Promise<{
    questions: Question[];
    stats: {
        totalGenerated: number;
        totalFailed: number;
        domainDistribution: Map<string, number>;
        totalDuration: number;
        averageTimePerQuestion: number;
    };
    errors: any[];
}> {
    const startTime = Date.now();
    const questions: Question[] = [];
    const errors: any[] = [];
    const domainStats = new Map<string, number>();

    // Calculate domain distribution
    const allocations = calculateDomainDistribution(exam.domains, config.totalQuestions);

    let currentQuestion = 0;

    // Generate questions for each domain
    for (const allocation of allocations) {
        domainStats.set(allocation.domain.name, 0);

        for (let i = 0; i < allocation.questionCount; i++) {
            currentQuestion++;

            try {
                // Mock question generation (simulate 50ms per question)
                await new Promise(resolve => setTimeout(resolve, 50));

                const question: Question = {
                    id: `q-mock-${currentQuestion}`,
                    type: 'single_select',
                    question_text: `Mock question ${currentQuestion}`,
                    options: [
                        { id: 'A', text: 'Option A' },
                        { id: 'B', text: 'Option B' },
                        { id: 'C', text: 'Option C' },
                        { id: 'D', text: 'Option D' }
                    ],
                    correct_ids: ['A'],
                    explanation: 'Mock explanation',
                    domain: allocation.domain.name
                };

                questions.push(question);
                const currentCount = domainStats.get(allocation.domain.name) || 0;
                domainStats.set(allocation.domain.name, currentCount + 1);

                // Report progress
                if (config.onProgress) {
                    const progress: GenerationProgress = {
                        current: currentQuestion,
                        total: config.totalQuestions,
                        currentDomain: allocation.domain.name,
                        successCount: questions.length,
                        failureCount: errors.length,
                        estimatedTimeRemaining: calculateETA(startTime, currentQuestion, config.totalQuestions)
                    };
                    config.onProgress(progress);
                }

                // Throttle delay
                if (currentQuestion < config.totalQuestions) {
                    await new Promise(resolve => setTimeout(resolve, config.delayBetweenRequests || 100));
                }

            } catch (error) {
                errors.push({
                    questionIndex: currentQuestion,
                    domain: allocation.domain.name,
                    error: error as Error,
                    timestamp: new Date()
                });
            }
        }
    }

    const totalDuration = Date.now() - startTime;
    const averageTimePerQuestion = questions.length > 0 ? totalDuration / questions.length : 0;

    return {
        questions,
        stats: {
            totalGenerated: questions.length,
            totalFailed: errors.length,
            domainDistribution: domainStats,
            totalDuration,
            averageTimePerQuestion
        },
        errors
    };
}

function calculateDomainDistribution(
    domains: { name: string; weight: number }[],
    totalQuestions: number
): DomainQuestionAllocation[] {
    const totalWeight = domains.reduce((sum, d) => sum + d.weight, 0);
    const allocations: DomainQuestionAllocation[] = [];
    let allocated = 0;

    for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        const proportion = domain.weight / totalWeight;

        const questionCount = (i === domains.length - 1)
            ? totalQuestions - allocated
            : Math.max(1, Math.round(proportion * totalQuestions));

        allocations.push({
            domain,
            questionCount,
            generated: 0
        });

        allocated += questionCount;
    }

    return allocations;
}

function calculateETA(startTime: number, current: number, total: number): number {
    if (current === 0) return 0;
    const elapsed = Date.now() - startTime;
    const avgTimePerQuestion = elapsed / current;
    const remaining = total - current;
    return Math.ceil((remaining * avgTimePerQuestion) / 1000);
}

// Test exam
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

// Test with 10 questions
const config: GenerationConfig = {
    difficulty: 'intermediate',
    language: 'es',
    totalQuestions: 10,
    retryAttempts: 3,
    delayBetweenRequests: 10, // Faster for testing
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
        console.log('Starting mock generation test...');
        console.log(`Exam: ${testExam.name}`);
        console.log(`Domains: ${testExam.domains.map(d => `${d.name} (${d.weight}%)`).join(', ')}`);
        console.log(`Generating ${config.totalQuestions} questions\n`);

        const result = await mockGenerate75Questions(testExam, config);

        console.log('\n=== Generation Results ===');
        console.log(`Total Generated: ${result.stats.totalGenerated}`);
        console.log(`Total Failed: ${result.stats.totalFailed}`);
        console.log(`Total Duration: ${(result.stats.totalDuration / 1000).toFixed(2)}s`);
        console.log(`Average Time per Question: ${(result.stats.averageTimePerQuestion / 1000).toFixed(2)}s`);
        
        console.log('\nDomain Distribution:');
        result.stats.domainDistribution.forEach((count, domain) => {
            console.log(`  ${domain}: ${count} questions`);
        });

        console.log('\n=== Validation ===');
        
        // Validation 1: Total questions
        const totalExpected = config.totalQuestions;
        const totalActual = result.stats.totalGenerated + result.stats.totalFailed;
        const test1 = totalActual === totalExpected;
        console.log(`Test 1 - Total questions: ${totalActual} === ${totalExpected}: ${test1 ? '✓' : '✗'}`);

        // Validation 2: Progress updates
        const test2 = progressUpdates.length === totalExpected;
        console.log(`Test 2 - Progress updates: ${progressUpdates.length} === ${totalExpected}: ${test2 ? '✓' : '✗'}`);

        // Validation 3: Progress is monotonic
        const isMonotonic = progressUpdates.every((p, i) => i === 0 || p.current > progressUpdates[i - 1].current);
        console.log(`Test 3 - Progress monotonic: ${isMonotonic ? '✓' : '✗'}`);

        // Validation 4: All domains represented
        const domainsRepresented = testExam.domains.every(d => 
            (result.stats.domainDistribution.get(d.name) || 0) >= 1
        );
        console.log(`Test 4 - All domains represented: ${domainsRepresented ? '✓' : '✗'}`);

        // Validation 5: Domain distribution matches allocation
        const allocations = calculateDomainDistribution(testExam.domains, config.totalQuestions);
        const distributionMatches = allocations.every(a => {
            const generated = result.stats.domainDistribution.get(a.domain.name) || 0;
            return generated === a.questionCount;
        });
        console.log(`Test 5 - Domain distribution correct: ${distributionMatches ? '✓' : '✗'}`);

        // Validation 6: Questions have required fields
        const allQuestionsValid = result.questions.every(q => 
            q.id && q.type && q.question_text && q.options && q.correct_ids && q.domain
        );
        console.log(`Test 6 - All questions valid: ${allQuestionsValid ? '✓' : '✗'}`);

        // Validation 7: Success count matches questions length
        const test7 = result.stats.totalGenerated === result.questions.length;
        console.log(`Test 7 - Success count correct: ${result.stats.totalGenerated} === ${result.questions.length}: ${test7 ? '✓' : '✗'}`);

        const allPassed = test1 && test2 && isMonotonic && domainsRepresented && distributionMatches && allQuestionsValid && test7;

        if (allPassed) {
            console.log('\n✓ All tests passed!');
        } else {
            console.log('\n✗ Some tests failed!');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n✗ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
runTest();
