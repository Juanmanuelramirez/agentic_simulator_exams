/**
 * Test script for enhanced LibrarianAgent.discoverExam()
 * 
 * This script demonstrates the new features:
 * - Optional official_guide_url parameter
 * - Confidence scoring
 * - Validation of discovered information
 * - Enhanced error handling
 */

import { librarian } from '../src/agents/librarian';

async function testDiscovery() {
    console.log('=== Testing Enhanced LibrarianAgent.discoverExam() ===\n');

    // Test 1: Discovery with official guide URL
    console.log('Test 1: Discovering exam WITH official guide URL');
    console.log('---------------------------------------------------');
    try {
        const result1 = await librarian.discoverExam(
            'AWS Solutions Architect Associate',
            'https://aws.amazon.com/certification/certified-solutions-architect-associate/'
        );
        
        console.log('✓ Discovery successful!');
        console.log(`  Exam Name: ${result1.exam.name}`);
        console.log(`  Provider: ${result1.exam.provider}`);
        console.log(`  Confidence: ${result1.confidence}`);
        console.log(`  Source: ${result1.source}`);
        console.log(`  Validation Status: ${result1.validation.isValid ? 'Valid' : 'Invalid'}`);
        console.log(`  Domains Found: ${result1.exam.domains.length}`);
        
        if (result1.validation.warnings.length > 0) {
            console.log(`  Warnings: ${result1.validation.warnings.join(', ')}`);
        }
        
        console.log('\n  Domains:');
        result1.exam.domains.forEach(domain => {
            console.log(`    - ${domain.name}: ${domain.weight}%`);
        });
    } catch (error) {
        console.error('✗ Discovery failed:', error);
    }

    console.log('\n');

    // Test 2: Discovery without official guide URL
    console.log('Test 2: Discovering exam WITHOUT official guide URL');
    console.log('---------------------------------------------------');
    try {
        const result2 = await librarian.discoverExam('Azure Data Fundamentals');
        
        console.log('✓ Discovery successful!');
        console.log(`  Exam Name: ${result2.exam.name}`);
        console.log(`  Provider: ${result2.exam.provider}`);
        console.log(`  Confidence: ${result2.confidence}`);
        console.log(`  Source: ${result2.source}`);
        console.log(`  Validation Status: ${result2.validation.isValid ? 'Valid' : 'Invalid'}`);
        console.log(`  Domains Found: ${result2.exam.domains.length}`);
        
        if (result2.validation.warnings.length > 0) {
            console.log(`  Warnings: ${result2.validation.warnings.join(', ')}`);
        }
        
        console.log('\n  Domains:');
        result2.exam.domains.forEach(domain => {
            console.log(`    - ${domain.name}: ${domain.weight}%`);
        });
    } catch (error) {
        console.error('✗ Discovery failed:', error);
    }

    console.log('\n=== Test Complete ===');
}

// Run the test
testDiscovery().catch(console.error);
