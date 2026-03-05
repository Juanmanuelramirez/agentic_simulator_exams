import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "../services/aws";
import { robustParseJson } from "../services/ai-utils";
import { dbService } from '../services/db';
import type { Exam, ExamDiscoveryResult } from '../types';

/**
 * Librarian Agent
 * Responsible for discovering information about certification exams from the web/AI
 * and managing the certification catalog in the database.
 */
export class LibrarianAgent {
    private client = bedrockClient;

    /**
     * Uses Bedrock to validate and return a list of certifications based on a search query.
     */
    async searchCertifications(query: string): Promise<string[]> {
        console.log(`Librarian: Validating certifications for "${query}"...`);

        const prompt = `
            You are a certification expert. Based on the user search query "${query}", return a list of 3-5 real, currently active technical certifications.
            Return ONLY a JSON array of strings. No preamble.
            Example: ["AWS Certified Solutions Architect - Associate", "AWS Certified Developer - Associate"]
        `;

        try {
            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-3-haiku-20240307-v1:0",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 500,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                }),
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const rawText = responseBody.content[0].text;

            return robustParseJson<string[]>(rawText);
        } catch (error) {
            console.error("Librarian: search failure", error);
            return [query];
        }
    }

    /**
     * Searches for an exam and returns the extracted blueprint structure using Bedrock.
     * Persists the newly discovered exam to DynamoDB.
     * 
     * @param query - The exam name or search query
     * @param official_guide_url - Optional URL to the official exam guide for more accurate discovery
     * @returns Promise<ExamDiscoveryResult> - The discovered exam with confidence score
     */
    async discoverExam(
        query: string, 
        official_guide_url?: string
    ): Promise<ExamDiscoveryResult> {
        console.log(`Librarian: Discovering AI blueprint for "${query}"...`);
        if (official_guide_url) {
            console.log(`Librarian: Using official guide URL: ${official_guide_url}`);
        }

        const prompt = official_guide_url 
            ? `
            Discover the official blueprint for the certification: "${query}".
            Use the official guide URL as a reference: ${official_guide_url}
            
            Identify the core domains and their relative percentage weights based on the official documentation.
            Validate that the information is accurate and complete.
            
            Return a valid JSON object with the following structure:
            {
                "exam": {
                    "id": "short-code-id",
                    "name": "Full Official Name",
                    "provider": "Company Name",
                    "description": "Short 1-sentence description",
                    "duration_minutes": 130,
                    "total_questions_official": 60,
                    "domains": [
                        { "name": "Domain Name", "weight": 25 },
                        ...
                    ]
                },
                "confidence": "high" | "medium" | "low",
                "validation": {
                    "domains_validated": true,
                    "weights_sum_to_100": true,
                    "official_source_found": true
                },
                "source": "official_guide" | "general_knowledge"
            }
            
            The total domain weights must sum to 100.
            Confidence should be "high" if you found official documentation, "medium" if based on reliable sources, "low" if uncertain.
            Strictly return ONLY the JSON object.
            `
            : `
            Discover the official blueprint for the certification: "${query}".
            Identify the core domains and their relative percentage weights based on current official documentation.
            
            Return a valid JSON object with the following structure:
            {
                "exam": {
                    "id": "short-code-id",
                    "name": "Full Official Name",
                    "provider": "Company Name",
                    "description": "Short 1-sentence description",
                    "duration_minutes": 130,
                    "total_questions_official": 60,
                    "domains": [
                        { "name": "Domain Name", "weight": 25 },
                        ...
                    ]
                },
                "confidence": "high" | "medium" | "low",
                "validation": {
                    "domains_validated": true,
                    "weights_sum_to_100": true,
                    "official_source_found": false
                },
                "source": "general_knowledge"
            }
            
            The total domain weights must sum to 100.
            Confidence should be "high" if you're certain about the information, "medium" if mostly confident, "low" if uncertain.
            Strictly return ONLY the JSON object.
            `;

        try {
            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-3-haiku-20240307-v1:0",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1500,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                }),
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const rawText = responseBody.content[0].text;

            const discoveryResult = robustParseJson<any>(rawText);

            // Validate the discovered information
            const validation = this.validateExamData(discoveryResult.exam);
            
            if (!validation.isValid) {
                console.warn(`Librarian: Validation warnings: ${validation.warnings.join(', ')}`);
            }

            const exam: Exam = {
                ...discoveryResult.exam,
                id: discoveryResult.exam.id || `gen-${Date.now()}`,
                official_guide_url: official_guide_url,
                is_active: true,
                created_by: 'system', // TODO: Replace with actual admin user ID
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Persist to Production Database
            await dbService.saveExam(exam);
            
            return {
                exam,
                confidence: discoveryResult.confidence || 'medium',
                validation: {
                    ...discoveryResult.validation,
                    ...validation
                },
                source: discoveryResult.source || 'general_knowledge'
            };

        } catch (error) {
            console.error("Librarian: Discovery failure", error);
            
            // Fallback for safety
            const fallbackExam: Exam = {
                id: `gen-${Date.now()}`,
                name: query,
                provider: 'Auto-discovered',
                description: 'Blueprint generated via AI fallback.',
                duration_minutes: 120,
                total_questions_official: 60,
                domains: [{ name: 'General Domain', weight: 100 }],
                official_guide_url: official_guide_url,
                is_active: true,
                created_by: 'system',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            return {
                exam: fallbackExam,
                confidence: 'low',
                validation: {
                    domains_validated: false,
                    weights_sum_to_100: true,
                    official_source_found: false,
                    isValid: false,
                    warnings: ['Discovery failed, using fallback data']
                },
                source: 'fallback'
            };
        }
    }

    /**
     * Validates exam data to ensure it meets requirements
     */
    private validateExamData(exam: any): { isValid: boolean; warnings: string[] } {
        const warnings: string[] = [];

        // Check required fields
        if (!exam.name || exam.name.trim() === '') {
            warnings.push('Exam name is missing or empty');
        }

        if (!exam.provider || exam.provider.trim() === '') {
            warnings.push('Provider is missing or empty');
        }

        if (!exam.domains || !Array.isArray(exam.domains) || exam.domains.length === 0) {
            warnings.push('Domains array is missing or empty');
        }

        // Validate domain weights sum to 100
        if (exam.domains && Array.isArray(exam.domains)) {
            const totalWeight = exam.domains.reduce((sum: number, d: any) => sum + (d.weight || 0), 0);
            if (Math.abs(totalWeight - 100) > 0.1) {
                warnings.push(`Domain weights sum to ${totalWeight}, expected 100`);
            }

            // Check each domain has name and positive weight
            exam.domains.forEach((domain: any, index: number) => {
                if (!domain.name || domain.name.trim() === '') {
                    warnings.push(`Domain ${index + 1} is missing a name`);
                }
                if (typeof domain.weight !== 'number' || domain.weight <= 0) {
                    warnings.push(`Domain "${domain.name}" has invalid weight: ${domain.weight}`);
                }
            });
        }

        // Validate numeric fields
        if (typeof exam.duration_minutes !== 'number' || exam.duration_minutes <= 0) {
            warnings.push('Duration must be a positive number');
        }

        if (typeof exam.total_questions_official !== 'number' || exam.total_questions_official <= 0) {
            warnings.push('Total questions must be a positive number');
        }

        return {
            isValid: warnings.length === 0,
            warnings
        };
    }
}

export const librarian = new LibrarianAgent();
