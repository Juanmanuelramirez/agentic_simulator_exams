import { createDynamoDBClient, hasActiveSession } from "./aws";
import {
    PutCommand,
    ScanCommand,
    QueryCommand,
    DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Exam, ExamAttempt, Question, GenerationJob } from "../types";

const TABLES = {
    EXAMS: "ExamSimulator-Simulators",
    QUESTIONS: "ExamSimulator-Questions",
    ATTEMPTS: "ExamSimulator-Attempts",
    GENERATION_JOBS: "ExamSimulator-GenerationJobs",
    ORGANIZATIONS: "ExamSimulator-Organizations",
    SUBSCRIPTIONS: "ExamSimulator-Subscriptions",
    COUPONS: "ExamSimulator-Coupons",
};

export { TABLES };

export const dbService = {
    /** Verifica si hay una sesión activa con credenciales temporales válidas */
    async hasValidCredentials(): Promise<boolean> {
        return hasActiveSession();
    },

    // ── EXAMS ────────────────────────────────────────────────────────────────
    async getExams(): Promise<Exam[]> {
        const client = await createDynamoDBClient();
        const response = await client.send(new ScanCommand({ TableName: TABLES.EXAMS }));
        return (response.Items as Exam[]) || [];
    },

    async saveExam(exam: Exam): Promise<void> {
        const client = await createDynamoDBClient();
        await client.send(new PutCommand({ TableName: TABLES.EXAMS, Item: exam }));
    },

    async deleteExam(examId: string): Promise<void> {
        const client = await createDynamoDBClient();
        await client.send(new DeleteCommand({
            TableName: TABLES.EXAMS,
            Key: { id: examId },
        }));
    },

    // ── QUESTIONS ────────────────────────────────────────────────────────────
    async getQuestionsByExam(examId: string): Promise<Question[]> {
        const client = await createDynamoDBClient();
        const response = await client.send(new QueryCommand({
            TableName: TABLES.QUESTIONS,
            IndexName: "ExamQuestionsIndex",
            KeyConditionExpression: "exam_id = :examId",
            ExpressionAttributeValues: { ":examId": examId },
        }));
        return (response.Items as Question[]) || [];
    },

    async saveQuestion(question: Question & { exam_id: string }): Promise<void> {
        const client = await createDynamoDBClient();
        await client.send(new PutCommand({ TableName: TABLES.QUESTIONS, Item: question }));
    },

    // ── ATTEMPTS ─────────────────────────────────────────────────────────────
    async getUserAttempts(userId: string): Promise<ExamAttempt[]> {
        const client = await createDynamoDBClient();
        const response = await client.send(new QueryCommand({
            TableName: TABLES.ATTEMPTS,
            IndexName: "UserAttemptsIndex",
            KeyConditionExpression: "user_id = :userId",
            ExpressionAttributeValues: { ":userId": userId },
        }));
        return (response.Items as ExamAttempt[]) || [];
    },

    async saveAttempt(attempt: ExamAttempt & { user_id: string }): Promise<void> {
        const client = await createDynamoDBClient();
        await client.send(new PutCommand({ TableName: TABLES.ATTEMPTS, Item: attempt }));
    },

    async deleteAttempt(attemptId: string): Promise<void> {
        const client = await createDynamoDBClient();
        await client.send(new DeleteCommand({
            TableName: TABLES.ATTEMPTS,
            Key: { id: attemptId },
        }));
    },

    // ── GENERATION JOBS ───────────────────────────────────────────────────────
    async saveGenerationJob(job: GenerationJob): Promise<void> {
        const client = await createDynamoDBClient();
        await client.send(new PutCommand({ TableName: TABLES.GENERATION_JOBS, Item: job }));
    },

    async updateGenerationJob(
        jobId: string,
        updates: Partial<Omit<GenerationJob, "id" | "created_at">>
    ): Promise<void> {
        const client = await createDynamoDBClient();
        await client.send(new PutCommand({
            TableName: TABLES.GENERATION_JOBS,
            Item: { id: jobId, ...updates, updated_at: new Date().toISOString() },
        }));
    },

    async getGenerationJob(jobId: string): Promise<GenerationJob | null> {
        const client = await createDynamoDBClient();
        const response = await client.send(new QueryCommand({
            TableName: TABLES.GENERATION_JOBS,
            KeyConditionExpression: "id = :jobId",
            ExpressionAttributeValues: { ":jobId": jobId },
        }));
        return (response.Items?.[0] as GenerationJob) || null;
    },
};
