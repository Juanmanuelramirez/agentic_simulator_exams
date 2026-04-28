import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * AWS Client Factory - Credenciales temporales via Cognito Identity Pool
 *
 * NO se usan Access Keys estáticas. Las credenciales son obtenidas
 * automáticamente por Amplify desde Cognito Identity Pool (STS AssumeRole).
 * Cada sesión de usuario autenticado recibe credenciales temporales con
 * permisos mínimos definidos en el rol IAM del Identity Pool.
 */

// Bedrock Model IDs
// Claude 3 Haiku - disponible sin suscripción adicional en us-east-1
export const AI_MODELS = {
    CLAUDE_3_HAIKU: "anthropic.claude-3-haiku-20240307-v1:0",
    CLAUDE_HAIKU_4_5: "anthropic.claude-3-haiku-20240307-v1:0",
    DEFAULT_FAST: "anthropic.claude-3-haiku-20240307-v1:0"
};

/**
 * Obtiene credenciales temporales de la sesión Cognito activa.
 * Amplify las renueva automáticamente antes de que expiren.
 */
async function getSessionCredentials() {
    const session = await fetchAuthSession();
    const creds = session.credentials;
    if (!creds) {
        throw new Error("No hay sesión activa. El usuario debe estar autenticado.");
    }
    return {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
    };
}

/**
 * Crea un cliente Bedrock con credenciales temporales de la sesión actual.
 * Bedrock requiere us-east-1 para disponibilidad de Claude 3.
 */
export async function createBedrockClient(): Promise<BedrockRuntimeClient> {
    const credentials = await getSessionCredentials();
    return new BedrockRuntimeClient({
        region: 'us-east-1',
        credentials,
    });
}

/**
 * Crea un cliente DynamoDB con credenciales temporales de la sesión actual.
 */
export async function createDynamoDBClient(): Promise<DynamoDBDocumentClient> {
    const credentials = await getSessionCredentials();
    const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
    const client = new DynamoDBClient({ region, credentials });
    return DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true },
    });
}

/**
 * Crea un cliente S3 con credenciales temporales de la sesión actual.
 * Usado para subir imágenes generadas por IA al bucket de exámenes.
 */
export async function createS3Client(): Promise<S3Client> {
    const credentials = await getSessionCredentials();
    const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
    return new S3Client({ region, credentials });
}

/**
 * Verifica si hay una sesión activa con credenciales válidas.
 * Usado por dbService.hasValidCredentials()
 */
export async function hasActiveSession(): Promise<boolean> {
    try {
        const session = await fetchAuthSession();
        return !!session.credentials?.accessKeyId;
    } catch {
        return false;
    }
}
