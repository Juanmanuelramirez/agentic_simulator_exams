import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

/**
 * Translation Agent
 * Responsible for translating UI strings using AWS Translate.
 */
export class TranslationAgent {
    private client: TranslateClient;

    constructor() {
        this.client = new TranslateClient({
            region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'dummy',
                secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'dummy',
            }
        });
    }

    /**
     * Translates a given text to the target language.
     */
    async translate(text: string, targetLanguage: string): Promise<string> {
        // Simple mapping for browser language codes to AWS Translate codes
        const langMap: Record<string, string> = {
            'es': 'es',
            'en': 'en',
            'fr': 'fr',
            'pt': 'pt',
            'de': 'de',
            'it': 'it'
        };

        const target = langMap[targetLanguage.split('-')[0]] || 'en';

        // Shortcut if it's already in English (assuming base strings are in English or Spanish)
        // For this MVP, we consider everything is English or Spanish.

        try {
            // Fallback for development/demo
            if (import.meta.env.VITE_AWS_ACCESS_KEY_ID === 'dummy' || !import.meta.env.VITE_AWS_ACCESS_KEY_ID) {
                console.log(`Translation Mock: Translating "${text}" to ${target}`);
                return text; // In a real mock, we could use a dictionary.
            }

            const command = new TranslateTextCommand({
                Text: text,
                SourceLanguageCode: 'auto',
                TargetLanguageCode: target
            });

            const response = await this.client.send(command);
            return response.TranslatedText || text;
        } catch (error) {
            console.error("Translation Agent Tool: AWS Translate failed", error);
            return text;
        }
    }
}

export const translationAgent = new TranslationAgent();
