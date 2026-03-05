/**
 * Manual test script for calculateDomainDistribution function
 * Run with: npx tsx scripts/test-domain-distribution.ts
 */

import type { DomainQuestionAllocation } from '../src/types';

// Inline implementation for testing without AWS dependencies
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

// Test Case 1: AWS SAA-C03 exam with 75 questions
console.log('Test Case 1: AWS SAA-C03 with 75 questions');
const awsDomains = [
    { name: 'Design Secure Architectures', weight: 30 },
    { name: 'Design Resilient Architectures', weight: 26 },
    { name: 'Design High-Performing Architectures', weight: 24 },
    { name: 'Design Cost-Optimized Architectures', weight: 20 }
];

const result1 = calculateDomainDistribution(awsDomains, 75);
console.log('Result:');
result1.forEach(allocation => {
    console.log(`  ${allocation.domain.name}: ${allocation.questionCount} questions (${allocation.domain.weight}% weight)`);
});

const sum1 = result1.reduce((acc, a) => acc + a.questionCount, 0);
console.log(`Total: ${sum1} (Expected: 75)`);
console.log(`✓ Sum matches: ${sum1 === 75}`);
console.log(`✓ All domains have at least 1: ${result1.every(a => a.questionCount >= 1)}`);
console.log('');

// Test Case 2: Equal weights
console.log('Test Case 2: Equal weights with 50 questions');
const equalDomains = [
    { name: 'Domain A', weight: 25 },
    { name: 'Domain B', weight: 25 },
    { name: 'Domain C', weight: 25 },
    { name: 'Domain D', weight: 25 }
];

const result2 = calculateDomainDistribution(equalDomains, 50);
console.log('Result:');
result2.forEach(allocation => {
    console.log(`  ${allocation.domain.name}: ${allocation.questionCount} questions`);
});

const sum2 = result2.reduce((acc, a) => acc + a.questionCount, 0);
console.log(`Total: ${sum2} (Expected: 50)`);
console.log(`✓ Sum matches: ${sum2 === 50}`);
console.log('');

// Test Case 3: Extreme weights
console.log('Test Case 3: Extreme weights with 20 questions');
const extremeDomains = [
    { name: 'Major Domain', weight: 80 },
    { name: 'Minor Domain 1', weight: 10 },
    { name: 'Minor Domain 2', weight: 10 }
];

const result3 = calculateDomainDistribution(extremeDomains, 20);
console.log('Result:');
result3.forEach(allocation => {
    console.log(`  ${allocation.domain.name}: ${allocation.questionCount} questions (${allocation.domain.weight}% weight)`);
});

const sum3 = result3.reduce((acc, a) => acc + a.questionCount, 0);
console.log(`Total: ${sum3} (Expected: 20)`);
console.log(`✓ Sum matches: ${sum3 === 20}`);
console.log(`✓ All domains have at least 1: ${result3.every(a => a.questionCount >= 1)}`);
console.log('');

// Test Case 4: Small total with many domains
console.log('Test Case 4: Small total (10) with 5 domains');
const manyDomains = [
    { name: 'Domain 1', weight: 20 },
    { name: 'Domain 2', weight: 20 },
    { name: 'Domain 3', weight: 20 },
    { name: 'Domain 4', weight: 20 },
    { name: 'Domain 5', weight: 20 }
];

const result4 = calculateDomainDistribution(manyDomains, 10);
console.log('Result:');
result4.forEach(allocation => {
    console.log(`  ${allocation.domain.name}: ${allocation.questionCount} questions`);
});

const sum4 = result4.reduce((acc, a) => acc + a.questionCount, 0);
console.log(`Total: ${sum4} (Expected: 10)`);
console.log(`✓ Sum matches: ${sum4 === 10}`);
console.log(`✓ All domains have at least 1: ${result4.every(a => a.questionCount >= 1)}`);
console.log('');

console.log('All tests completed!');
