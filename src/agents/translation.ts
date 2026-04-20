import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * Translation Agent
 * Responsible for translating UI strings using AWS Translate.
 * Usa credenciales temporales de la sesión Cognito (sin Access Keys estáticas).
 */
export class TranslationAgent {

    private async getClient(): Promise<TranslateClient> {
        const session = await fetchAuthSession();
        const creds = session.credentials;
        return new TranslateClient({
            region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
            credentials: creds
                ? {
                    accessKeyId: creds.accessKeyId,
                    secretAccessKey: creds.secretAccessKey,
                    sessionToken: creds.sessionToken,
                }
                : undefined,
        });
    }

    async translate(text: string, targetLanguage: string): Promise<string> {
        const langMap: Record<string, string> = {
            'es': 'es', 'en': 'en', 'fr': 'fr',
            'pt': 'pt', 'de': 'de', 'it': 'it',
        };
        const target = langMap[targetLanguage.split('-')[0]] || 'en';

        try {
            const client = await this.getClient();
            const command = new TranslateTextCommand({
                Text: text,
                SourceLanguageCode: 'auto',
                TargetLanguageCode: target,
            });
            const response = await client.send(command);
            return response.TranslatedText || text;
        } catch (error) {
            console.error("Translation Agent: AWS Translate failed", error);
            return text;
        }
    }
}

export const translationAgent = new TranslationAgent();
