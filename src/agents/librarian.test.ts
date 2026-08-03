import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibrarianAgent } from './librarian';
import { dbService } from '../services/db';

// Mock del cliente Bedrock async
const mockSend = vi.fn();
vi.mock('../services/aws', () => ({
    createBedrockClient: vi.fn().mockResolvedValue({ send: mockSend }),
    AI_MODELS: {
        DEFAULT_FAST: "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    }
}));

// Mock del servicio de base de datos
vi.mock('../services/db', () => ({
    dbService: {
        saveExam: vi.fn()
    }
}));

describe('LibrarianAgent - Enhanced discoverExam', () => {
    let librarian: LibrarianAgent;

    beforeEach(() => {
        librarian = new LibrarianAgent();
        vi.clearAllMocks();
    });

    describe('discoverExam with official_guide_url', () => {
        it('should discover exam with high confidence when official URL is provided', async () => {
            const mockResponse = {
                exam: {
                    id: 'aws-saa-c03',
                    name: 'AWS Solutions Architect Associate',
                    provider: 'AWS',
                    description: 'Design and deploy scalable systems on AWS',
                    duration_minutes: 130,
                    total_questions_official: 65,
                    domains: [
                        { name: 'Design Secure Architectures', weight: 30 },
                        { name: 'Design Resilient Architectures', weight: 26 },
                        { name: 'Design High-Performing Architectures', weight: 24 },
                        { name: 'Design Cost-Optimized Architectures', weight: 20 }
                    ]
                },
                confidence: 'high',
                validation: {
                    domains_validated: true,
                    weights_sum_to_100: true,
                    official_source_found: true
                },
                source: 'official_guide'
            };

            mockSend.mockResolvedValue({
                body: new TextEncoder().encode(JSON.stringify({
                    content: [{ text: JSON.stringify(mockResponse) }]
                }))
            });

            vi.mocked(dbService.saveExam).mockResolvedValue(undefined);

            const result = await librarian.discoverExam(
                'AWS Solutions Architect Associate',
                'https://aws.amazon.com/certification/certified-solutions-architect-associate/'
            );

            expect(result.confidence).toBe('high');
            expect(result.source).toBe('official_guide');
            expect(result.validation.official_source_found).toBe(true);
            expect(result.validation.isValid).toBe(true);
            expect(result.exam.official_guide_url).toBe('https://aws.amazon.com/certification/certified-solutions-architect-associate/');
            expect(result.exam.domains).toHaveLength(4);
            expect(dbService.saveExam).toHaveBeenCalledWith(expect.objectContaining({
                name: 'AWS Solutions Architect Associate',
                provider: 'AWS'
            }));
        });

        it('should discover exam without official URL', async () => {
            const mockResponse = {
                exam: {
                    id: 'test-cert',
                    name: 'Test Certification',
                    provider: 'Test Provider',
                    description: 'A test certification',
                    duration_minutes: 120,
                    total_questions_official: 60,
                    domains: [
                        { name: 'Domain 1', weight: 50 },
                        { name: 'Domain 2', weight: 50 }
                    ]
                },
                confidence: 'medium',
                validation: {
                    domains_validated: true,
                    weights_sum_to_100: true,
                    official_source_found: false
                },
                source: 'general_knowledge'
            };

            mockSend.mockResolvedValue({
                body: new TextEncoder().encode(JSON.stringify({
                    content: [{ text: JSON.stringify(mockResponse) }]
                }))
            });

            vi.mocked(dbService.saveExam).mockResolvedValue(undefined);

            const result = await librarian.discoverExam('Test Certification');

            expect(result.confidence).toBe('medium');
            expect(result.source).toBe('general_knowledge');
            expect(result.validation.official_source_found).toBe(false);
            expect(result.exam.official_guide_url).toBeUndefined();
        });
    });

    describe('validation', () => {
        it('should validate domain weights sum to 100', async () => {
            const mockResponse = {
                exam: {
                    id: 'test-cert',
                    name: 'Test Certification',
                    provider: 'Test Provider',
                    description: 'A test certification',
                    duration_minutes: 120,
                    total_questions_official: 60,
                    domains: [
                        { name: 'Domain 1', weight: 60 },
                        { name: 'Domain 2', weight: 30 }
                    ]
                },
                confidence: 'medium',
                validation: {
                    domains_validated: true,
                    weights_sum_to_100: false,
                    official_source_found: false
                },
                source: 'general_knowledge'
            };

            mockSend.mockResolvedValue({
                body: new TextEncoder().encode(JSON.stringify({
                    content: [{ text: JSON.stringify(mockResponse) }]
                }))
            });

            vi.mocked(dbService.saveExam).mockResolvedValue(undefined);

            const result = await librarian.discoverExam('Test Certification');

            expect(result.validation.isValid).toBe(false);
            expect(result.validation.warnings).toContain('Domain weights sum to 90, expected 100');
        });

        it('should validate required fields are present', async () => {
            const mockResponse = {
                exam: {
                    id: 'test-cert',
                    name: '',
                    provider: 'Test Provider',
                    description: 'A test certification',
                    duration_minutes: 120,
                    total_questions_official: 60,
                    domains: []
                },
                confidence: 'low',
                validation: {
                    domains_validated: false,
                    weights_sum_to_100: false,
                    official_source_found: false
                },
                source: 'general_knowledge'
            };

            mockSend.mockResolvedValue({
                body: new TextEncoder().encode(JSON.stringify({
                    content: [{ text: JSON.stringify(mockResponse) }]
                }))
            });

            vi.mocked(dbService.saveExam).mockResolvedValue(undefined);

            const result = await librarian.discoverExam('Test Certification');

            expect(result.validation.isValid).toBe(false);
            expect(result.validation.warnings).toContain('Exam name is missing or empty');
            expect(result.validation.warnings).toContain('Domains array is missing or empty');
        });
    });

    describe('error handling', () => {
        it('should return fallback exam on discovery failure', async () => {
            mockSend.mockRejectedValue(new Error('Bedrock API error'));
            vi.mocked(dbService.saveExam).mockResolvedValue(undefined);

            const result = await librarian.discoverExam('Test Certification', 'https://example.com');

            expect(result.confidence).toBe('low');
            expect(result.source).toBe('fallback');
            expect(result.validation.isValid).toBe(false);
            expect(result.validation.warnings).toContain('Discovery failed, using fallback data');
            expect(result.exam.name).toBe('Test Certification');
            expect(result.exam.official_guide_url).toBe('https://example.com');
            expect(result.exam.domains).toHaveLength(1);
            expect(result.exam.domains[0].weight).toBe(100);
        });
    });
});
