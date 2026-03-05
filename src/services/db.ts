import { docClient } from "./aws";
import {
    PutCommand,
    ScanCommand,
    QueryCommand,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import type { Exam, ExamAttempt, Question, GenerationJob } from "../types";

const TABLES = {
    EXAMS: "ExamSimulator-Simulators",
    QUESTIONS: "ExamSimulator-Questions",
    ATTEMPTS: "ExamSimulator-Attempts",
    GENERATION_JOBS: "ExamSimulator-GenerationJobs"
};

export const dbService = {
    /** Verify if real credentials are being used */
    hasValidCredentials(): boolean {
        return !!import.meta.env.VITE_AWS_ACCESS_KEY_ID &&
            import.meta.env.VITE_AWS_ACCESS_KEY_ID !== 'dummy';
    },

    // --- EXAMS (Simulators) ---
    async getExams(): Promise<Exam[]> {
        const command = new ScanCommand({ TableName: TABLES.EXAMS });
        const response = await docClient.send(command);
        return (response.Items as Exam[]) || [];
    },

    async saveExam(exam: Exam): Promise<void> {
        const command = new PutCommand({
            TableName: TABLES.EXAMS,
            Item: exam
        });
        await docClient.send(command);
    },

    async deleteExam(examId: string): Promise<void> {
        const command = new DeleteCommand({
            TableName: TABLES.EXAMS,
            Key: { id: examId }
        });
        await docClient.send(command);
    },

    // --- QUESTIONS ---
    async getQuestionsByExam(examId: string): Promise<Question[]> {
        const command = new QueryCommand({
            TableName: TABLES.QUESTIONS,
            IndexName: "ExamQuestionsIndex",
            KeyConditionExpression: "exam_id = :examId",
            ExpressionAttributeValues: { ":examId": examId }
        });
        const response = await docClient.send(command);
        return (response.Items as Question[]) || [];
    },

    async saveQuestion(question: Question & { exam_id: string }): Promise<void> {
        const command = new PutCommand({
            TableName: TABLES.QUESTIONS,
            Item: question
        });
        await docClient.send(command);
    },

    // --- ATTEMPTS ---
    async getUserAttempts(userId: string): Promise<ExamAttempt[]> {
        const command = new QueryCommand({
            TableName: TABLES.ATTEMPTS,
            IndexName: "UserAttemptsIndex",
            KeyConditionExpression: "user_id = :userId",
            ExpressionAttributeValues: { ":userId": userId }
        });
        const response = await docClient.send(command);
        return (response.Items as ExamAttempt[]) || [];
    },

    async saveAttempt(attempt: ExamAttempt & { user_id: string }): Promise<void> {
        const command = new PutCommand({
            TableName: TABLES.ATTEMPTS,
            Item: attempt
        });
        await docClient.send(command);
    },

    // --- GENERATION JOBS ---
    async saveGenerationJob(job: GenerationJob): Promise<void> {
        const command = new PutCommand({
            TableName: TABLES.GENERATION_JOBS,
            Item: job
        });
        await docClient.send(command);
    },

    async updateGenerationJob(
        jobId: string,
        updates: Partial<Omit<GenerationJob, 'id' | 'created_at'>>
    ): Promise<void> {
        // Build update expression dynamically
        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        // Always update updated_at
        updates.updated_at = new Date().toISOString();

        Object.keys(updates).forEach((key, index) => {
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;
            updateExpressions.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = updates[key as keyof typeof updates];
        });

        const command = new PutCommand({
            TableName: TABLES.GENERATION_JOBS,
            Item: {
                id: jobId,
                ...updates
            }
        });

        await docClient.send(command);
    },

    async getGenerationJob(jobId: string): Promise<GenerationJob | null> {
        const command = new QueryCommand({
            TableName: TABLES.GENERATION_JOBS,
            KeyConditionExpression: "id = :jobId",
            ExpressionAttributeValues: { ":jobId": jobId }
        });
        const response = await docClient.send(command);
        return (response.Items?.[0] as GenerationJob) || null;
    }
};
