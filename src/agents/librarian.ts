import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "../services/aws";
import { robustParseJson } from "../services/ai-utils";
import { dbService } from '../services/db';
import type { Exam } from '../types';

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
     */
    async discoverExam(query: string): Promise<Exam> {
        console.log(`Librarian: Discovering AI blueprint for "${query}"...`);

        const prompt = `
            Discover the official blueprint for the certification: "${query}".
            Identify the core domains and their relative percentage weights based on current official documentation.
            Return a valid JSON object:
            {
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
            }
            The total weights must sum to 100.
            Strictly return ONLY the JSON object.
        `;

        try {
            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-3-haiku-20240307-v1:0",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                }),
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const rawText = responseBody.content[0].text;

            const aiGenerated = robustParseJson<any>(rawText);

            const exam: Exam = {
                ...aiGenerated,
                id: aiGenerated.id || `gen-${Date.now()}`
            };

            // Persist to Production Database
            await dbService.saveExam(exam);
            return exam;

        } catch (error) {
            console.error("Librarian: Discovery failure", error);
            // Fallback for safety
            return {
                id: `gen-${Date.now()}`,
                name: query,
                provider: 'Auto-discovered',
                description: 'Blueprint generated via AI fallback.',
                duration_minutes: 120,
                total_questions_official: 60,
                domains: [{ name: 'General Domain', weight: 100 }]
            };
        }
    }
}

export const librarian = new LibrarianAgent();
