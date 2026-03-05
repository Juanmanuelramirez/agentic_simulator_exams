import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SolverAgent } from './solver';
import type { Exam, BlockGenerationConfig } from '../types';

describe('SolverAgent - Progressive Generation', () => {
    let solver: SolverAgent;
    let mockExam: Exam;

    beforeEach(() => {
        solver = new SolverAgent();
        mockExam = {
            id: 'test-exam-1',
            name: 'Test Certification',
            provider: 'Test Provider',
            domains: [
                { name: 'Domain 1', weight: 40 },
                { name: 'Domain 2', weight: 30 },
                { name: 'Domain 3', weight: 30 }
            ],
            duration_minutes: 120,
            total_questions_official: 50
        };
    });

    describe('generateQuestionsProgressive', () => {
        it('should generate first block synchronously when totalQuestions <= blockSize', async () => {
            const config: BlockGenerationConfig = {
                difficulty: 'intermediate',
                language: 'es',
                totalQuestions: 5,
                blockSize: 10,
                initialBlockOnly: false,
                retryAttempts: 3,
                delayBetweenRequests: 100
            };

            // Mock the generate75Questions method to avoid actual API calls
            const mockGenerate = vi.spyOn(solver, 'generate75Questions').mockResolvedValue({
                questions: Array(5).fill(null).map((_, i) => ({
                    id: `q-${i}`,
                    type: 'single_select',
                    domain: 'Domain 1',
                    question_text: `Question ${i}`,
                    options: [],
                    correct_ids: ['A'],
                    explanation: 'Test',
                    why_correct: 'Test',
                    why_incorrect: [],
                    official_link: 'https://test.com'
                })),
                stats: {
                    totalGenerated: 5,
                    totalFailed: 0,
                    domainDistribution: new Map([['Domain 1', 5]]),
                    totalDuration: 1000,
                    averageTimePerQuestion: 200
                },
                errors: []
            });

            const result = await solver.generateQuestionsProgressive(mockExam, config);

            expect(result.firstBlock).toHaveLength(5);
            expect(result.totalRequested).toBe(5);
            expect(result.generationStatus).toBe('completed');
            expect(result.backgroundJobId).toBeUndefined();
            expect(mockGenerate).toHaveBeenCalledTimes(1);
        });

        it('should start background job when totalQuestions > blockSize', async () => {
            const config: BlockGenerationConfig = {
                difficulty: 'intermediate',
                language: 'es',
                totalQuestions: 25,
                blockSize: 10,
                initialBlockOnly: false,
                retryAttempts: 3,
                delayBetweenRequests: 100
            };

            // Mock the generate75Questions method
            const mockGenerate = vi.spyOn(solver, 'generate75Questions').mockResolvedValue({
                questions: Array(10).fill(null).map((_, i) => ({
                    id: `q-${i}`,
                    type: 'single_select',
                    domain: 'Domain 1',
                    question_text: `Question ${i}`,
                    options: [],
                    correct_ids: ['A'],
                    explanation: 'Test',
                    why_correct: 'Test',
                    why_incorrect: [],
                    official_link: 'https://test.com'
                })),
                stats: {
                    totalGenerated: 10,
                    totalFailed: 0,
                    domainDistribution: new Map([['Domain 1', 10]]),
                    totalDuration: 2000,
                    averageTimePerQuestion: 200
                },
                errors: []
            });

            const result = await solver.generateQuestionsProgressive(mockExam, config);

            expect(result.firstBlock).toHaveLength(10);
            expect(result.totalRequested).toBe(25);
            expect(result.generationStatus).toBe('in_progress');
            expect(result.backgroundJobId).toBeDefined();
            expect(result.backgroundJobId).toMatch(/^job-/);
            
            // First block should be generated synchronously
            expect(mockGenerate).toHaveBeenCalledTimes(1);
            expect(mockGenerate).toHaveBeenCalledWith(
                mockExam,
                expect.objectContaining({
                    totalQuestions: 10
                })
            );
        });

        it('should not start background job when initialBlockOnly is true', async () => {
            const config: BlockGenerationConfig = {
                difficulty: 'intermediate',
                language: 'es',
                totalQuestions: 25,
                blockSize: 10,
                initialBlockOnly: true,
                retryAttempts: 3,
                delayBetweenRequests: 100
            };

            // Mock the generate75Questions method
            const mockGenerate = vi.spyOn(solver, 'generate75Questions').mockResolvedValue({
                questions: Array(10).fill(null).map((_, i) => ({
                    id: `q-${i}`,
                    type: 'single_select',
                    domain: 'Domain 1',
                    question_text: `Question ${i}`,
                    options: [],
                    correct_ids: ['A'],
                    explanation: 'Test',
                    why_correct: 'Test',
                    why_incorrect: [],
                    official_link: 'https://test.com'
                })),
                stats: {
                    totalGenerated: 10,
                    totalFailed: 0,
                    domainDistribution: new Map([['Domain 1', 10]]),
                    totalDuration: 2000,
                    averageTimePerQuestion: 200
                },
                errors: []
            });

            const result = await solver.generateQuestionsProgressive(mockExam, config);

            expect(result.firstBlock).toHaveLength(10);
            expect(result.totalRequested).toBe(25);
            expect(result.generationStatus).toBe('completed');
            expect(result.backgroundJobId).toBeUndefined();
            expect(mockGenerate).toHaveBeenCalledTimes(1);
        });

        it('should generate attemptId with correct format', async () => {
            const config: BlockGenerationConfig = {
                difficulty: 'intermediate',
                language: 'es',
                totalQuestions: 5,
                blockSize: 10,
                initialBlockOnly: false,
                retryAttempts: 3,
                delayBetweenRequests: 100
            };

            vi.spyOn(solver, 'generate75Questions').mockResolvedValue({
                questions: [],
                stats: {
                    totalGenerated: 0,
                    totalFailed: 0,
                    domainDistribution: new Map(),
                    totalDuration: 0,
                    averageTimePerQuestion: 0
                },
                errors: []
            });

            const result = await solver.generateQuestionsProgressive(mockExam, config);

            expect(result.attemptId).toMatch(/^att-\d+-[a-z0-9]+$/);
        });
    });
});
