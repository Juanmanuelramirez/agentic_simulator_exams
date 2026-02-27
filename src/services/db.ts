import { docClient } from "./aws";
import {
    PutCommand,
    ScanCommand,
    QueryCommand,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import type { Exam, ExamAttempt, Question } from "../types";

const TABLES = {
    EXAMS: "ExamSimulator-Simulators",
    QUESTIONS: "ExamSimulator-Questions",
    ATTEMPTS: "ExamSimulator-Attempts"
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
    }
};
