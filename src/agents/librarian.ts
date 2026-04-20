import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockClient, AI_MODELS } from "../services/aws";
import { robustParseJson } from "../services/ai-utils";
import { dbService } from '../services/db';
import type { Exam, ExamDiscoveryResult } from '../types';

/**
 * Librarian Agent
 * Responsible for discovering information about certification exams from the web/AI
 * and managing the certification catalog in the database.
 */
export class LibrarianAgent {

    /**
     * Uses Bedrock to validate and return a list of certifications based on a search query.
     */
    async searchCertifications(query: string): Promise<string[]> {
        console.log(`Librarian: Validating certifications for "${query}"...`);

        const prompt = `
            You are a certification expert. Based on the user search query "${query}", return a list of 3-5 real, currently active technical certifications with their FULL OFFICIAL names.
            Return ONLY a JSON array of strings with the complete official certification name. No preamble.
            Example: ["AWS Certified Solutions Architect - Associate (SAA-C03)", "AWS Certified Developer - Associate (DVA-C02)"]
            IMPORTANT: Use the complete official name including the exam code if available.
        `;

        try {
            const command = new InvokeModelCommand({
                modelId: AI_MODELS.DEFAULT_FAST,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 500,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                }),
            });

            const client = await createBedrockClient();
            const response = await client.send(command);
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

        const commonExamFields = `
                    "id": "short-code-id",
                    "name": "Full Official Name",
                    "provider": "Company Name",
                    "description": "Short 1-sentence description of the certification",
                    "duration_minutes": 130,
                    "total_questions_official": 65,
                    "target_role": "The professional role this certification validates (e.g. 'DevOps Engineer', 'Solutions Architect', 'Project Manager', 'Cloud Developer', 'Security Engineer', 'Data Engineer'). Extract this from the official certification description.",
                    "difficulty_context": {
                        "beginner": "Description of what beginner-level questions look like for THIS specific certification (foundational concepts, basic service usage)",
                        "intermediate": "Description of what intermediate-level questions look like for THIS certification (multi-service scenarios, trade-offs, operational decisions)",
                        "advanced": "Description of what advanced-level questions look like for THIS certification (complex enterprise scenarios, multi-account, compliance, disaster recovery)"
                    },
                    "system_prompt": "A comprehensive system prompt (300-500 words) that instructs an AI to generate exam questions at the EXACT level of the real certification exam. This prompt MUST include: (1) The specific professional persona to adopt (e.g. 'Senior DevOps Engineer with 10+ years experience'). (2) The types of enterprise scenarios to create (e.g. 'multi-account AWS Organizations, cross-account IAM, Policy as Code'). (3) Rules for creating plausible distractors that test deep knowledge, not surface-level recall. (4) Instructions to make explanations shuffle-proof (never reference options by letter A/B/C/D, always by service/concept name). (5) The complexity escalation strategy specific to this certification's discipline.",
                    "domains": [
                        { "name": "Domain Name", "weight": 25 }
                    ]`;

        const prompt = official_guide_url 
            ? `
            Discover the official blueprint for the certification: "${query}".
            Use the official guide URL as a reference: ${official_guide_url}
            
            CRITICAL: Identify the TARGET PROFESSIONAL ROLE from the official certification description.
            For example: "DevOps Engineer" for AWS DevOps Professional, "Solutions Architect" for AWS SAA, "Project Manager" for PMP, etc.
            Also generate difficulty_context specific to this certification's domain of expertise.
            
            Return a valid JSON object:
            {
                "exam": {
                    ${commonExamFields}
                },
                "confidence": "high",
                "validation": {
                    "domains_validated": true,
                    "weights_sum_to_100": true,
                    "official_source_found": true
                },
                "source": "official_guide"
            }
            
            The total domain weights must sum to 100.
            Strictly return ONLY the JSON object.
            `
            : `
            Discover the official blueprint for the certification: "${query}".
            Identify the core domains, weights, target professional role, and difficulty context from official documentation.
            
            CRITICAL: The "target_role" must reflect the ACTUAL professional role this certification validates.
            Examples: "DevOps Engineer", "Solutions Architect", "Cloud Developer", "Project Manager", "Security Engineer", "Data Engineer", "SysOps Administrator", "Scrum Master".
            
            The "difficulty_context" must be SPECIFIC to this certification's discipline, not generic cloud concepts.
            
            Return a valid JSON object:
            {
                "exam": {
                    ${commonExamFields}
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
            Strictly return ONLY the JSON object.
            `;

        try {
            const command = new InvokeModelCommand({
                modelId: AI_MODELS.DEFAULT_FAST,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1500,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                }),
            });

            const client = await createBedrockClient();
            const response = await client.send(command);
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
