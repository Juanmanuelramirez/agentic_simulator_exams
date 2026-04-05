import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * AWS Client Factory
 * Standardizes regional configuration for all services.
 * DynamoDB: us-east-2 (Ohio)
 * Bedrock: us-east-1 (N. Virginia)
 */

const CREDENTIALS = {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'dummy',
};

// Bedrock Model IDs
export const AI_MODELS = {
    CLAUDE_3_HAIKU: "anthropic.claude-3-haiku-20240307-v1:0",
    CLAUDE_3_5_HAIKU: "anthropic.claude-3-5-haiku-20241022-v1:0",
    DEFAULT_FAST: "anthropic.claude-3-5-haiku-20241022-v1:0"
};

// Bedrock Client (Hardcoded to us-east-1 for Claude 3 Haiku availability)
export const bedrockClient = new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: CREDENTIALS
});

// DynamoDB Client (Uses us-east-2 as defined in infrastructure)
export const dbClient = new DynamoDBClient({
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
    credentials: CREDENTIALS
});

export const docClient = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: { removeUndefinedValues: true }
});
