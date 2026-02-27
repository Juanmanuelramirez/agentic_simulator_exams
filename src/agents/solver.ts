import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "../services/aws";
import { robustParseJson } from "../services/ai-utils";
import type { Exam, Question, QuestionType } from '../types';
import { dbService } from '../services/db';

/**
 * Solver Agent
 * Responsible for generating questions "Just-in-Time" using AWS Bedrock.
 * It respects official domain weights and persists results in DynamoDB.
 */
export class SolverAgent {
    private client = bedrockClient;

    constructor() { }

    /**
     * Generates a single question based on the exam blueprint.
     * Persists the generated question to DynamoDB.
     */
    async generateQuestion(exam: Exam, difficulty: string = 'intermediate', language: string = 'es', specificDomain?: { name: string; weight: number }): Promise<Question> {
        console.log(`Solver: Requesting AI generation (${language}) for ${exam.name} [Diff: ${difficulty}]...`);

        const domain = specificDomain || this.selectDomainByWeight(exam);
        const type: QuestionType = Math.random() > 0.3 ? 'single_select' : 'multi_select';

        try {
            const prompt = `
                Eres un instructor experto en la certificación "${exam.name}" con muchos años de experiencia realizando simuladores de exámenes para esta certificación "${exam.name}".
                Me vas a ayudar a generar preguntas tipo examen para un simulador, enfocado para alumnos que estudiando este simulador pasaran el examen al primer intento.
                
                REQUISITOS DE LA PREGUNTA:
                - Tomando en cuenta el examen real las preguntas son: Complejas, explicando escenarios de empresas y con algunos distractores incluidos en las preguntas.
                - Las respuestas deben ser muy parecidas entre sí, pero con pequeñas modificaciones para confundir al lector.
                - Tipo de pregunta: "${type}".
                - Dominio: "${domain.name}".
                - Dificultad: "${difficulty}" (Debes de tomar en cuenta la dificultad seleccionada para realizar la pregunta).
                ${type === 'multi_select' ? '- Se incluyen preguntas en donde se pueden seleccionar de 2 a 3 respuestas. Debes configurar la pregunta para que se deban seleccionar exactamente entre 2 y 3 respuestas correctas.' : '- Selección Única: Solo una de las opciones es correcta.'}

                IMPORTANT: The response MUST be generated entirely in the following language: ${language}.
                
                The response MUST be a valid JSON object with the following structure:
                {
                    "question_text": "Texto de la pregunta (basado en el escenario complejo)",
                    "options": [
                        {"id": "A", "text": "Texto de la opción A"},
                        {"id": "B", "text": "Texto de la opción B"},
                        {"id": "C", "text": "Texto de la opción C"},
                        {"id": "D", "text": "Texto de la opción D"}
                    ],
                    "correct_ids": ["A", "C"], // Para multi_select (2-3), o ["B"] para single_select
                    "explanation": "Resumen general de por qué la solución es correcta.",
                    "why_correct": "Explicación específica de por qué las opciones seleccionadas son las correctas.",
                    "why_incorrect": [
                        "Explicación de por qué la opción A no es correcta (si aplica)",
                        "Explicación de por qué la opción B no es correcta (si aplica)",
                        "Explicación de por qué la opción C no es correcta (si aplica)",
                        "Explicación de por qué la opción D no es correcta (si aplica)"
                    ],
                    "official_link": "Enlace a la documentación oficial de referencia"
                }

                Strictly return ONLY the JSON object. No preamble or post-amble.
            `;

            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-3-haiku-20240307-v1:0",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1500,
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    temperature: 0,
                }),
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const rawText = responseBody.content[0].text;

            const aiGenerated = robustParseJson<any>(rawText);

            const question: Question = {
                id: `q-${Math.random().toString(36).substr(2, 9)}`,
                type,
                domain: domain.name,
                ...aiGenerated
            };

            // Persist to Question Bank in DynamoDB
            await dbService.saveQuestion({ ...question, exam_id: exam.id });

            return question;

        } catch (error) {
            console.error("Solver: AI generation failure detail:", error);
            throw error;
        }
    }

    /**
     * Generates a batch of questions upfront.
     * Sequentially generates questions to avoid ThrottlingException in Bedrock.
     * Guarantees coverage of all domains.
     */
    async generateBatch(exam: Exam, count: number = 10, difficulty: string = 'intermediate', language: string = 'es'): Promise<Question[]> {
        console.log(`Solver: Starting generation for ${count} questions (Full AI Mode)...`);

        const domains = exam.domains && exam.domains.length > 0
            ? exam.domains
            : [{ name: 'General Information', weight: 100 }];

        // Sequential generation to stay within Bedrock quota limits
        const questions: Question[] = [];
        for (let i = 0; i < count; i++) {
            try {
                // Cycle through domains to guarantee coverage
                const domain = domains[i % domains.length];
                const q = await this.generateQuestion(exam, difficulty, language, domain);
                questions.push(q);
            } catch (error) {
                console.error(`Solver: Failed to generate question ${i + 1}/${count}`, error);
                if (questions.length > 0) {
                    console.warn(`Solver: Returning partial batch of ${questions.length} questions.`);
                    break;
                }
                throw error;
            }
        }

        console.log(`Solver: Successfully generated ${questions.length} questions.`);
        return questions;
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
}

export const solver = new SolverAgent();

