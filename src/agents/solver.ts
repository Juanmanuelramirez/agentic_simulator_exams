import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { Exam, Question, QuestionType } from '../types';

/**
 * Solver Agent
 * Responsible for generating questions "Just-in-Time" using AWS Bedrock.
 * It respects official domain weights and prevents hallucinations.
 */
export class SolverAgent {
    private client: BedrockRuntimeClient;

    constructor() {
        // In a real production environment, credentials should be handled via 
        // identity providers or a backend proxy. For demonstration, we check for env vars.
        this.client = new BedrockRuntimeClient({
            region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'dummy',
                secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'dummy',
            }
        });
    }

    /**
     * Generates a single question based on the exam blueprint.
     */
    async generateQuestion(exam: Exam, difficulty: string = 'intermediate', language: string = 'es'): Promise<Question> {
        console.log(`Solver: Requesting AI generation (${language}) for ${exam.name} [Diff: ${difficulty}]...`);

        const domain = this.selectDomainByWeight(exam);
        const type: QuestionType = Math.random() > 0.3 ? 'single_select' : 'multi_select';

        try {
            // Prompt construction for Bedrock (Claude 3 / Mistral / etc.)
            const prompt = `
                You are an expert certification exam writer. Generate a high-quality ${type} question for the ${exam.name} certification.
                Focus specifically on the domain: "${domain.name}".
                Difficulty level: ${difficulty}.
                
                IMPORTANT: The response MUST be generated entirely in the following language: ${language}.
                
                The response MUST be a valid JSON object with the following structure:
                {
                    "question_text": "The scenario-based question text",
                    "options": [
                        {"id": "A", "text": "Option A text"},
                        {"id": "B", "text": "Option B text"},
                        {"id": "C", "text": "Option C text"},
                        {"id": "D", "text": "Option D text"}
                    ],
                    "correct_ids": ["A", "C"], // For multi_select, or ["B"] for single_select
                    "explanation": "Detailed explanation of why the answers are correct and others are not.",
                    "official_link": "URL to official documentation"
                }

                Strictly return ONLY the JSON object. No preamble or post-amble.
            `;

            // Using Anthropic Claude 3 Haiku for speed and cost-efficiency in Bedrock
            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-3-haiku-20240307-v1:0",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1000,
                    messages: [
                        { role: "user", content: prompt }
                    ],
                }),
            });

            // If we have dummy credentials, we fallback to a smart mock that simulates the AI behavior
            if (import.meta.env.VITE_AWS_ACCESS_KEY_ID === 'dummy' || !import.meta.env.VITE_AWS_ACCESS_KEY_ID) {
                return this.generateSmartMock(domain, type, difficulty);
            }

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const aiGenerated = JSON.parse(responseBody.content[0].text);

            return {
                id: `q-${Math.random().toString(36).substr(2, 9)}`,
                type,
                domain: domain.name,
                ...aiGenerated
            };

        } catch (error) {
            console.error("Solver: AI generation failed, falling back to smart mock", error);
            return this.generateSmartMock(domain, type, difficulty);
        }
    }

    private selectDomainByWeight(exam: Exam) {
        if (!exam.domains || exam.domains.length === 0) {
            return { name: 'General Information', weight: 100 };
        }
        const totalWeight = exam.domains.reduce((sum, d) => sum + d.weight, 0);
        let random = Math.random() * totalWeight;

        for (const domain of exam.domains) {
            if (random < domain.weight) return domain;
            random -= domain.weight;
        }

        return exam.domains[0];
    }

    private async generateSmartMock(domain: { name: string; weight: number }, type: QuestionType, difficulty: string): Promise<Question> {
        // Improved mock that feels like Bedrock for development
        await new Promise(resolve => setTimeout(resolve, 1500));

        const scenarios = [
            `A solutions architect is designing a system for ${domain.name}. Which approach ensures maximum reliability?`,
            `A developer needs to implement a solution for ${domain.name} that minimizes latencies. What is the best service to use?`,
            `An organization is concerned about security in ${domain.name}. Which two features should they enable?`
        ];

        const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        return {
            id: `q-mock-${Math.random().toString(36).substr(2, 9)}`,
            type,
            question_text: `[AI Simulated] ${selectedScenario} (Difficulty: ${difficulty})`,
            options: [
                { id: 'A', text: `Optimize ${domain.name} using Managed Service X` },
                { id: 'B', text: `Implement automated scaling for ${domain.name} resources` },
                { id: 'C', text: `Use specialized caching layer for ${domain.name} data` },
                { id: 'D', text: `Configure cross-region replication for ${domain.name}` },
            ],
            correct_ids: type === 'multi_select' ? ['A', 'C'] : ['B'],
            explanation: `This simulated explanation confirms that for ${domain.name}, following best practices regarding automation and managed services is crucial. This would be dynamically generated by Claude 3 in production.`,
            domain: domain.name,
            official_link: 'https://docs.aws.amazon.com/general/latest/gr/welcome.html'
        };
    }
}

export const solver = new SolverAgent();

