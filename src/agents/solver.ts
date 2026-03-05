import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "../services/aws";
import { robustParseJson } from "../services/ai-utils";
import type { Exam, Question, QuestionType, DomainQuestionAllocation, GenerationConfig, GenerationJob } from '../types';
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


    /**
     * Calculates the number of questions to generate based on official count and percentage.
     * Ensures a minimum of 10 questions regardless of percentage.
     *
     * @param officialCount - The official exam question count
     * @param percentage - The percentage to calculate (50, 75, or 100)
     * @returns The calculated question count with minimum of 10
     */
    calculateQuestionCount(
        officialCount: number,
        percentage: 50 | 75 | 100
    ): number {
        const calculated = Math.round(officialCount * (percentage / 100));
        return Math.max(10, calculated);
    }

    /**
     * Calculates proportional distribution of questions across exam domains.
     * Ensures each domain receives at least 1 question and the sum equals totalQuestions.
     *
     * Algorithm:
     * 1. Calculate proportional allocation based on domain weights
     * 2. Ensure minimum of 1 question per domain
     * 3. Adjust last domain to account for rounding differences
     *
     * @param domains - Array of exam domains with weights
     * @param totalQuestions - Total number of questions to distribute
     * @returns Array of domain allocations with question counts
     */
    calculateDomainDistribution(
        domains: { name: string; weight: number }[],
        totalQuestions: number
    ): DomainQuestionAllocation[] {
        // Calculate total weight
        const totalWeight = domains.reduce((sum, d) => sum + d.weight, 0);
        const allocations: DomainQuestionAllocation[] = [];
        let allocated = 0;

        // Step 1: Calculate proportional allocation for each domain
        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            const proportion = domain.weight / totalWeight;

            // For last domain, allocate remaining questions to ensure exact sum
            const questionCount = (i === domains.length - 1)
                ? totalQuestions - allocated
                : Math.max(1, Math.round(proportion * totalQuestions));

            allocations.push({
                domain,
                questionCount,
                generated: 0
            });

            allocated += questionCount;
        }

        return allocations;
    }
    /**
     * Delays execution for the specified number of milliseconds.
     * Used for throttling API requests to prevent rate limiting.
     *
     * @param ms - Number of milliseconds to delay
     * @returns Promise that resolves after the delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculates the estimated time remaining for question generation.
     * Based on the average time per question so far.
     * 
     * Note: This method will be used in the generate75Questions implementation (Task 7)
     *
     * @param startTime - The timestamp when generation started (from Date.now())
     * @param current - Number of questions generated so far
     * @param total - Total number of questions to generate
     * @returns Estimated time remaining in seconds (0 if current is 0)
     */
    calculateETA(
        startTime: number,
        current: number,
        total: number
    ): number {
        // Handle edge case when no progress has been made yet
        if (current === 0) return 0;

        // Calculate elapsed time and average time per question
        const elapsed = Date.now() - startTime;
        const avgTimePerQuestion = elapsed / current;
        const remaining = total - current;

        // Return estimated time in seconds (rounded up)
        return Math.ceil((remaining * avgTimePerQuestion) / 1000);
    }

    /**
     * Determines if an error is retryable based on its type.
     * Retryable errors include transient failures that may succeed on retry.
     *
     * @param error - The error to check
     * @returns true if the error is retryable, false otherwise
     */
    private isRetryableError(error: unknown): boolean {
        if (!(error instanceof Error)) return false;

        const retryableErrors = [
            'ServiceUnavailable',
            'InternalServerError',
            'RequestTimeout',
            'NetworkingError',
            'ThrottlingException',
            'TooManyRequestsException'
        ];

        return retryableErrors.some(msg => error.message.includes(msg));
    }

    /**
     * Generates a single question with retry logic and exponential backoff.
     * Wraps the existing generateQuestion() method with robust error handling.
     *
     * Algorithm:
     * 1. Attempt to generate question using generateQuestion()
     * 2. On failure, check if error is retryable
     * 3. If retryable and attempts remain, apply exponential backoff
     * 4. Retry with increased attempt number
     * 5. Throw error after exhausting all retry attempts
     *
     * @param exam - The exam for which to generate a question
     * @param domain - The specific domain for the question
     * @param config - Generation configuration including retry settings
     * @param attemptNumber - Current attempt number (1-indexed)
     * @returns Promise resolving to a generated Question
     * @throws Error after exhausting all retry attempts or on non-retryable error
     */
    async generateQuestionWithRetry(
        exam: Exam,
        domain: { name: string; weight: number },
        config: GenerationConfig,
        attemptNumber: number = 1
    ): Promise<Question> {
        try {
            // Call existing generateQuestion method
            const question = await this.generateQuestion(
                exam,
                config.difficulty,
                config.language,
                domain
            );

            return question;

        } catch (error) {
            // Determine if this is a retryable error
            const isThrottlingError =
                error instanceof Error &&
                (error.message.includes('ThrottlingException') ||
                    error.message.includes('TooManyRequestsException'));

            const shouldRetry =
                attemptNumber < (config.retryAttempts || 3) &&
                (isThrottlingError || this.isRetryableError(error));

            if (shouldRetry) {
                // Exponential backoff: 1s, 2s, 4s, 8s...
                const backoffDelay = Math.pow(2, attemptNumber - 1) * 1000;

                console.warn(
                    `[${new Date().toISOString()}] Retry attempt ${attemptNumber}/${config.retryAttempts || 3} ` +
                    `after ${backoffDelay}ms for domain "${domain.name}". ` +
                    `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                );

                // Wait for backoff delay
                await this.delay(backoffDelay);

                // Recursive retry with incremented attempt number
                return this.generateQuestionWithRetry(
                    exam,
                    domain,
                    config,
                    attemptNumber + 1
                );
            }

            // Max retries exhausted or non-retryable error
            console.error(
                `[${new Date().toISOString()}] Failed to generate question for domain "${domain.name}" ` +
                `after ${attemptNumber} attempt(s). Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    /**
     * Generates exactly 75 questions (or any configured amount) for an exam.
     * Orchestrates the complete generation process with domain distribution,
     * retry logic, progress tracking, and error handling.
     *
     * Algorithm:
     * 1. Calculate domain distribution based on weights
     * 2. For each domain, generate allocated number of questions
     * 3. Apply retry logic for failed generations
     * 4. Track progress and invoke callback after each question
     * 5. Apply throttle delay between requests to respect rate limits
     * 6. Handle errors gracefully and continue with remaining questions
     * 7. Return comprehensive results with stats and errors
     *
     * @param exam - The exam for which to generate questions
     * @param config - Generation configuration with defaults
     * @returns Promise resolving to GenerationResult with questions, stats, and errors
     */
    async generate75Questions(
        exam: Exam,
        config: GenerationConfig = {
            difficulty: 'intermediate',
            language: 'es',
            totalQuestions: 75,
            retryAttempts: 3,
            delayBetweenRequests: 100
        }
    ): Promise<import('../types').GenerationResult> {
        const startTime = Date.now();
        const questions: Question[] = [];
        const errors: import('../types').GenerationError[] = [];
        const domainStats = new Map<string, number>();

        console.log(`[${new Date().toISOString()}] Starting generation of ${config.totalQuestions} questions for exam "${exam.name}"`);

        // Step 1: Calculate domain distribution
        const allocations = this.calculateDomainDistribution(
            exam.domains,
            config.totalQuestions
        );

        console.log('Domain allocation:', allocations.map(a => 
            `${a.domain.name}: ${a.questionCount} questions`
        ).join(', '));

        let currentQuestion = 0;

        // Step 2: Generate questions for each domain
        for (const allocation of allocations) {
            // Initialize domain stats
            domainStats.set(allocation.domain.name, 0);

            console.log(`[${new Date().toISOString()}] Generating ${allocation.questionCount} questions for domain "${allocation.domain.name}"`);

            // Generate questions for this domain
            for (let i = 0; i < allocation.questionCount; i++) {
                currentQuestion++;

                try {
                    // Generate with retry logic
                    const question = await this.generateQuestionWithRetry(
                        exam,
                        allocation.domain,
                        config,
                        1
                    );

                    questions.push(question);
                    
                    // Update domain statistics
                    const currentCount = domainStats.get(allocation.domain.name) || 0;
                    domainStats.set(allocation.domain.name, currentCount + 1);

                    // Report progress
                    if (config.onProgress) {
                        const progress: import('../types').GenerationProgress = {
                            current: currentQuestion,
                            total: config.totalQuestions,
                            currentDomain: allocation.domain.name,
                            successCount: questions.length,
                            failureCount: errors.length,
                            estimatedTimeRemaining: this.calculateETA(
                                startTime,
                                currentQuestion,
                                config.totalQuestions
                            )
                        };
                        config.onProgress(progress);
                    }

                    // Throttle to respect Bedrock rate limits
                    if (currentQuestion < config.totalQuestions) {
                        await this.delay(config.delayBetweenRequests || 100);
                    }

                } catch (error) {
                    // Log error and continue with next question
                    const generationError: import('../types').GenerationError = {
                        questionIndex: currentQuestion,
                        domain: allocation.domain.name,
                        error: error as Error,
                        timestamp: new Date()
                    };
                    errors.push(generationError);

                    console.error(
                        `[${new Date().toISOString()}] Failed to generate question ${currentQuestion}/${config.totalQuestions} ` +
                        `for domain "${allocation.domain.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
                    );

                    // Still report progress even on failure
                    if (config.onProgress) {
                        const progress: import('../types').GenerationProgress = {
                            current: currentQuestion,
                            total: config.totalQuestions,
                            currentDomain: allocation.domain.name,
                            successCount: questions.length,
                            failureCount: errors.length,
                            estimatedTimeRemaining: this.calculateETA(
                                startTime,
                                currentQuestion,
                                config.totalQuestions
                            )
                        };
                        config.onProgress(progress);
                    }
                }
            }
        }

        const totalDuration = Date.now() - startTime;

        // Calculate average time per question (avoid division by zero)
        const averageTimePerQuestion = questions.length > 0 
            ? totalDuration / questions.length 
            : 0;

        const result: import('../types').GenerationResult = {
            questions,
            stats: {
                totalGenerated: questions.length,
                totalFailed: errors.length,
                domainDistribution: domainStats,
                totalDuration,
                averageTimePerQuestion
            },
            errors
        };

        console.log(
            `[${new Date().toISOString()}] Generation complete: ` +
            `${result.stats.totalGenerated} succeeded, ${result.stats.totalFailed} failed, ` +
            `total duration: ${(totalDuration / 1000).toFixed(2)}s, ` +
            `avg per question: ${(averageTimePerQuestion / 1000).toFixed(2)}s`
        );

        return result;
    }

    /**
     * Generates questions progressively in blocks for better UX.
     * Generates the first block (default 10 questions) synchronously,
     * then starts a background job for remaining questions.
     *
     * This enables students to start exams faster while remaining questions
     * generate in the background.
     *
     * Algorithm:
     * 1. Generate first block synchronously (up to blockSize questions)
     * 2. If more questions needed, start background generation job
     * 3. Return first block immediately with job ID for tracking
     *
     * @param exam - The exam for which to generate questions
     * @param config - Block generation configuration
     * @returns Promise resolving to BlockGenerationResult with first block and job info
     */
    async generateQuestionsProgressive(
        exam: Exam,
        config: import('../types').BlockGenerationConfig
    ): Promise<import('../types').BlockGenerationResult> {
        const { blockSize = 10, totalQuestions } = config;
        const attemptId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log(
            `[${new Date().toISOString()}] Starting progressive generation: ` +
            `${blockSize} questions in first block, ${totalQuestions} total`
        );

        // Step 1: Generate first block synchronously
        const firstBlockConfig: GenerationConfig = {
            ...config,
            totalQuestions: Math.min(blockSize, totalQuestions)
        };

        const firstBlockResult = await this.generate75Questions(
            exam,
            firstBlockConfig
        );

        console.log(
            `[${new Date().toISOString()}] First block complete: ` +
            `${firstBlockResult.stats.totalGenerated} questions generated`
        );

        // Step 2: If more questions needed, start background job
        if (totalQuestions > blockSize && !config.initialBlockOnly) {
            const remainingQuestions = totalQuestions - blockSize;

            console.log(
                `[${new Date().toISOString()}] Starting background generation for ` +
                `${remainingQuestions} remaining questions`
            );

            const remainingConfig: GenerationConfig = {
                ...config,
                totalQuestions: remainingQuestions
            };

            // Start background generation (non-blocking)
            const jobId = await this.startBackgroundGeneration(
                exam,
                remainingConfig,
                attemptId
            );

            return {
                attemptId,
                firstBlock: firstBlockResult.questions,
                totalRequested: totalQuestions,
                generationStatus: 'in_progress',
                backgroundJobId: jobId
            };
        }

        // All questions generated in first block
        console.log(
            `[${new Date().toISOString()}] All ${totalQuestions} questions ` +
            `generated in first block (no background job needed)`
        );

        return {
            attemptId,
            firstBlock: firstBlockResult.questions,
            totalRequested: totalQuestions,
            generationStatus: 'completed'
        };
    }

    /**
     * Starts a background generation job for remaining questions.
     * The job runs asynchronously without blocking the caller.
     *
     * @param exam - The exam for which to generate questions
     * @param config - Generation configuration for remaining questions
     * @param attemptId - The attempt ID to associate with this job
     * @returns Promise resolving to the job ID
     */
    private async startBackgroundGeneration(
        exam: Exam,
        config: GenerationConfig,
        attemptId: string
    ): Promise<string> {
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        // Extract user_id from config if available (BlockGenerationConfig extends GenerationConfig)
        const userId = (config as any).user_id || 'system';

        // Create generation job in database
        const job: GenerationJob = {
            id: jobId,
            exam_id: exam.id,
            user_id: userId,
            attempt_id: attemptId,
            status: 'pending',
            config,
            created_at: now,
            updated_at: now
        };

        try {
            await dbService.saveGenerationJob(job);
            console.log(
                `[${now}] Created generation job ${jobId} in database ` +
                `for attempt ${attemptId}`
            );
        } catch (error) {
            console.error(
                `[${now}] Failed to save generation job ${jobId} to database:`,
                error
            );
            // Continue anyway - the job will still run, just won't be tracked in DB
        }

        // Start async generation (non-blocking)
        // We intentionally don't await this - it runs in the background
        this.generateInBackground(jobId, exam, config, attemptId).catch(error => {
            console.error(
                `[${new Date().toISOString()}] Background generation failed for job ${jobId}:`,
                error
            );
            // Update job status to failed
            dbService.updateGenerationJob(jobId, {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
            }).catch(dbError => {
                console.error(
                    `[${new Date().toISOString()}] Failed to update job ${jobId} status:`,
                    dbError
                );
            });
        });

        return jobId;
    }

    /**
     * Executes question generation in the background.
     * This method runs asynchronously and logs progress.
     *
     * @param jobId - The unique job identifier
     * @param exam - The exam for which to generate questions
     * @param config - Generation configuration
     * @param attemptId - The attempt ID associated with this job
     */
    private async generateInBackground(
        jobId: string,
        exam: Exam,
        config: GenerationConfig,
        attemptId: string
    ): Promise<void> {
        const startTime = new Date().toISOString();
        console.log(
            `[${startTime}] Background job ${jobId} started ` +
            `for ${config.totalQuestions} questions`
        );

        // Update job status to in_progress
        try {
            await dbService.updateGenerationJob(jobId, {
                status: 'in_progress'
            });
        } catch (error) {
            console.error(
                `[${new Date().toISOString()}] Failed to update job ${jobId} status to in_progress:`,
                error
            );
        }

        try {
            const result = await this.generate75Questions(exam, {
                ...config,
                onProgress: async (progress) => {
                    // Log progress for monitoring
                    console.log(
                        `[${new Date().toISOString()}] Background job ${jobId} progress: ` +
                        `${progress.current}/${progress.total} questions, ` +
                        `domain: ${progress.currentDomain}, ` +
                        `ETA: ${progress.estimatedTimeRemaining}s`
                    );

                    // Update job progress in database
                    try {
                        await dbService.updateGenerationJob(jobId, {
                            progress: {
                                current: progress.current,
                                total: progress.total,
                                currentDomain: progress.currentDomain,
                                eta: progress.estimatedTimeRemaining
                            }
                        });
                    } catch (error) {
                        // Don't throw - just log the error and continue generation
                        console.error(
                            `[${new Date().toISOString()}] Failed to update job ${jobId} progress:`,
                            error
                        );
                    }
                }
            });

            console.log(
                `[${new Date().toISOString()}] Background job ${jobId} completed: ` +
                `${result.stats.totalGenerated} generated, ${result.stats.totalFailed} failed`
            );

            // Update job status to completed
            try {
                await dbService.updateGenerationJob(jobId, {
                    status: 'completed',
                    result: {
                        totalGenerated: result.stats.totalGenerated,
                        totalFailed: result.stats.totalFailed
                    }
                });
            } catch (error) {
                console.error(
                    `[${new Date().toISOString()}] Failed to update job ${jobId} status to completed:`,
                    error
                );
            }

        } catch (error) {
            console.error(
                `[${new Date().toISOString()}] Background job ${jobId} failed:`,
                error
            );
            throw error;
        }
    }

}

export const solver = new SolverAgent();

