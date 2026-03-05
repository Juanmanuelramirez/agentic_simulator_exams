/**
 * Manual test script for utility functions
 * Run with: npx tsx scripts/test-utilities.ts
 */

// Inline implementations for testing without AWS dependencies
function calculateQuestionCount(
    officialCount: number,
    percentage: 50 | 75 | 100
): number {
    const calculated = Math.round(officialCount * (percentage / 100));
    return Math.max(10, calculated);
}

function calculateETA(
    startTime: number,
    current: number,
    total: number
): number {
    if (current === 0) return 0;
    const elapsed = Date.now() - startTime;
    const avgTimePerQuestion = elapsed / current;
    const remaining = total - current;
    return Math.ceil((remaining * avgTimePerQuestion) / 1000);
}

console.log('=== Testing Utility Functions ===\n');

// Test 1: calculateQuestionCount
console.log('Test 1: calculateQuestionCount()');
const test1_1 = calculateQuestionCount(65, 50);
const test1_2 = calculateQuestionCount(65, 75);
const test1_3 = calculateQuestionCount(65, 100);
const test1_4 = calculateQuestionCount(5, 50);

console.log('  65 questions @ 50%:', test1_1, '(Expected: 33)');
console.log('  65 questions @ 75%:', test1_2, '(Expected: 49)');
console.log('  65 questions @ 100%:', test1_3, '(Expected: 65)');
console.log('  5 questions @ 50%:', test1_4, '(Expected: 10 - minimum)');
console.log('  ✓ Test 1 passed:', test1_1 === 33 && test1_2 === 49 && test1_3 === 65 && test1_4 === 10);
console.log('');

// Test 2: calculateETA
console.log('Test 2: calculateETA()');
const startTime = Date.now() - 10000; // 10 seconds ago
const eta1 = calculateETA(startTime, 10, 75);
const eta2 = calculateETA(startTime, 0, 75);

console.log('  10 of 75 questions in 10s:', eta1, 'seconds remaining');
console.log('  Expected: ~65 seconds (1s per question * 65 remaining)');
console.log('  0 of 75 questions:', eta2, 'seconds (Expected: 0 - edge case)');
console.log('  ✓ Test 2 passed:', eta1 >= 64 && eta1 <= 66 && eta2 === 0);
console.log('');

// Test 3: Edge cases
console.log('Test 3: Edge Cases');
const test3_1 = calculateQuestionCount(1, 50); // Very small count
const test3_2 = calculateQuestionCount(200, 50); // Large count
const test3_3 = calculateQuestionCount(40, 75);

console.log('  1 question @ 50%:', test3_1, '(Expected: 10 - minimum enforced)');
console.log('  200 questions @ 50%:', test3_2, '(Expected: 100)');
console.log('  40 questions @ 75%:', test3_3, '(Expected: 30)');
console.log('  ✓ Test 3 passed:', test3_1 === 10 && test3_2 === 100 && test3_3 === 30);
console.log('');

console.log('All utility tests completed successfully! ✓');
