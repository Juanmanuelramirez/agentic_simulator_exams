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
