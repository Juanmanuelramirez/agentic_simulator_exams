import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockClient, AI_MODELS } from "../services/aws";
import { robustParseJson } from "../services/ai-utils";
import type { ExamAttempt, StudyGuide, Exam } from '../types';

export class MentorAgent {

    constructor() { }

    async generateStudyGuide(attempts: ExamAttempt[], exams: Exam[], language: string = 'es'): Promise<StudyGuide> {
        console.log("Mentor: Analyzing performance to generate study guide...");

        const failedAttempts = attempts.filter(a => (a.score || 0) < 70);
        if (failedAttempts.length === 0 && attempts.length > 0) {
            // Even if they passed, find the areas with errors
            failedAttempts.push(...attempts);
        }

        const domainErrors: Record<string, number> = {};
        failedAttempts.forEach(attempt => {
            attempt.questions.forEach(q => {
                const isCorrect = q.user_selected_ids &&
                    q.user_selected_ids.length === q.correct_ids.length &&
                    q.user_selected_ids.every(id => q.correct_ids.includes(id));

                if (!isCorrect && q.domain) {
                    domainErrors[q.domain] = (domainErrors[q.domain] || 0) + 1;
                }
            });
        });

        const weakAreas = Object.entries(domainErrors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([domain]) => domain);

        if (weakAreas.length === 0) {
            weakAreas.push("General Concepts", "Best Practices");
        }

        const recentExamId = attempts[0]?.exam_id || 'general';
        const examName = exams.find(e => e.id === recentExamId)?.name || 'Technical Certification';

        const prompt = `
            You are an expert technical mentor and certification coach.
            Based on the student's performance in the ${examName} exam, they are struggling with these specific areas:
            ${weakAreas.map(a => `- ${a}`).join('\n')}

            Generate a personalized, high-retention 7-day study plan in ${language}.
            
            REQUIREMENTS:
            1. Create a checklist of specific tasks for each weak area.
            2. Each task must include a link to the official documentation for the certification "${examName}".
            3. Organize the tasks into a 7-day schedule.

            Format the response as a valid JSON object:
            {
                "title": "Short catchy title for the guide",
                "content": "A brief encouraging introduction or overview in markdown",
                "weak_areas": ["Area 1", "Area 2", "Area 3"],
                "tasks": [
                    {
                        "id": "t1",
                        "text": "Task description (e.g., Read about DynamoDB partitions)",
                        "official_link": "https://aws.amazon.com/..."
                    },
                    ...
                ],
                "plan_days": [
                    {
                        "day": 1,
                        "title": "Introduction to Area X",
                        "tasks": ["t1", "t2"]
                    },
                    ...
                ]
            }

            Return ONLY the JSON object.
        `;

        try {
            const command = new InvokeModelCommand({
                modelId: AI_MODELS.DEFAULT_FAST,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 4000,
                    messages: [
                        { role: "user", content: prompt }
                    ],
                }),
            });

            const client = await createBedrockClient();
            const response = await client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const rawText = responseBody.content[0].text;

            // Use robust parsing utility
            const aiGenerated = robustParseJson<any>(rawText);

            return {
                id: `guide-${Date.now()}`,
                exam_id: recentExamId,
                title: aiGenerated.title || "Guía de Repaso",
                content: aiGenerated.content || "Contenido no disponible.",
                weak_areas: aiGenerated.weak_areas || weakAreas,
                tasks: (aiGenerated.tasks || []).map((t: any) => ({ ...t, completed: false })),
                plan_days: aiGenerated.plan_days || [],
                created_at: new Date().toISOString()
            };

        } catch (error) {
            console.error("Mentor: AI generation failure detail:", error);
            throw error;
        }
    }
}

export const mentor = new MentorAgent();
