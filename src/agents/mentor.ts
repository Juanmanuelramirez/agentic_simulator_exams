import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockClient, AI_MODELS } from "../services/aws";
import { robustParseJson } from "../services/ai-utils";
import { analyzeDomainErrors, identifyWeakDomains } from "./examResultsAnalyzer";
import { prioritizePlan } from "./planPrioritizer";
import { ResourceResolver } from "./resourceResolver";
import type { ExamAttempt, StudyGuide, Exam, StudyDay } from '../types';

export class MentorAgent {

    constructor() { }

    async generateStudyGuide(attempts: ExamAttempt[], exams: Exam[], language: string = 'es'): Promise<StudyGuide> {
        console.log("Mentor: Analyzing performance to generate study guide...");

        // Validation: at least one completed attempt is required (Requirement 1.3)
        const completedAttempts = attempts.filter(a => a.status === 'completed');
        if (completedAttempts.length === 0) {
            throw new Error("At least one completed exam attempt is required to generate a study guide.");
        }

        // Analyze domain errors using the ExamResultsAnalyzer module (Requirement 1.1)
        const domainErrors = analyzeDomainErrors(completedAttempts);

        // Identify top 3 weak domains (Requirement 1.2)
        const weakDomains = identifyWeakDomains(domainErrors, 3);

        const weakAreas = weakDomains.map(d => d.domain);

        if (weakAreas.length === 0) {
            weakAreas.push("General Concepts", "Best Practices");
        }

        const recentExamId = attempts[0]?.exam_id || 'general';
        const matchedExam = exams.find(e => e.id === recentExamId);
        const examName = matchedExam?.name || 'Technical Certification';
        const provider = matchedExam?.provider || '';

        // Get all domain names from the matched exam for prioritization
        const allDomains = matchedExam?.domains?.map(d => d.name) || weakAreas;

        const prompt = `
            You are an expert technical mentor and certification coach.
            Based on the student's performance in the ${examName} exam (provider: ${provider}), they are struggling with these specific areas:
            ${weakAreas.map(a => `- ${a}`).join('\n')}

            Generate a personalized, high-retention 7-day study plan.
            
            CRITICAL: ALL text content (title, content, task descriptions, day titles) MUST be written in "${language}" language. Do NOT use English unless the language is "en".
            
            REQUIREMENTS:
            1. Create a checklist of specific tasks for each weak area. Write task descriptions in ${language}.
            2. For official_link: ONLY use URLs you are 100% certain exist. Use the provider's main documentation landing page if unsure of a specific page. For AWS use "https://docs.aws.amazon.com/", for Microsoft use "https://learn.microsoft.com/", etc. Do NOT invent deep paths that may not exist.
            3. Organize the tasks into a 7-day schedule. Write day titles in ${language}.
            4. The title and content fields MUST be in ${language}.

            Format the response as a valid JSON object:
            {
                "title": "Título corto y atractivo para la guía (en ${language})",
                "content": "Breve introducción motivacional en markdown (en ${language})",
                "weak_areas": ["Area 1", "Area 2", "Area 3"],
                "tasks": [
                    {
                        "id": "t1",
                        "text": "Descripción de la tarea en ${language}",
                        "official_link": "https://docs.aws.amazon.com/"
                    }
                ],
                "plan_days": [
                    {
                        "day": 1,
                        "title": "Título del día en ${language}",
                        "tasks": ["t1", "t2"]
                    }
                ]
            }

            Return ONLY the JSON object. Remember: ALL text MUST be in ${language}.
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

            // Apply plan prioritization based on weakness severity (Requirement 1.4, 6.1, 6.2, 6.3)
            const dayAssignments = prioritizePlan(weakDomains, allDomains, 7);

            // Get the AI-generated plan days
            const aiPlanDays: any[] = aiGenerated.plan_days || [];

            // Reorder AI-generated plan days based on prioritization
            // Map prioritized day assignments to AI content, preserving AI-generated content
            const prioritizedPlanDays: StudyDay[] = [];
            for (let i = 0; i < 7; i++) {
                const assignment = dayAssignments[i];
                // Use AI-generated content for this day position if available
                const aiDay = aiPlanDays[i] || { day: i + 1, title: assignment?.domain || `Day ${i + 1}`, tasks: [] };

                prioritizedPlanDays.push({
                    day: i + 1,
                    title: aiDay.title || `Day ${i + 1}`,
                    tasks: aiDay.tasks || [],
                    documentation: [],
                    videos: [],
                });
            }

            // Resolve resources for each day (Requirements 2.1, 3.1, 4.1, 5.1, 5.2, 5.4)
            const resourceResolver = new ResourceResolver();

            for (let i = 0; i < prioritizedPlanDays.length; i++) {
                const day = prioritizedPlanDays[i];
                const assignment = dayAssignments[i];
                const domain = assignment?.domain || weakAreas[0] || 'General';
                const topic = day.title || domain;

                try {
                    const resources = await resourceResolver.resolveResourcesForDay(
                        provider,
                        examName,
                        domain,
                        topic,
                        language
                    );
                    day.documentation = resources.documentation || [];
                    day.videos = resources.videos || [];
                } catch (error) {
                    console.error(`Mentor: Failed to resolve resources for day ${day.day}:`, error);
                    // Graceful degradation: keep empty arrays (Requirement 5.4)
                    day.documentation = [];
                    day.videos = [];
                }
            }

            return {
                id: `guide-${Date.now()}`,
                exam_id: recentExamId,
                title: aiGenerated.title || "Guía de Repaso",
                content: aiGenerated.content || "Contenido no disponible.",
                weak_areas: aiGenerated.weak_areas || weakAreas,
                tasks: (aiGenerated.tasks || []).map((t: any) => ({ ...t, completed: false })),
                plan_days: prioritizedPlanDays,
                created_at: new Date().toISOString()
            };

        } catch (error) {
            console.error("Mentor: AI generation failure detail:", error);
            throw error;
        }
    }
}

export const mentor = new MentorAgent();
