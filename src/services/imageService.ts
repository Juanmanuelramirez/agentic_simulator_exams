// src/services/imageService.ts
import type { Exam } from '../types';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createS3Client, createBedrockClient } from './aws';
import { adminService } from './adminService';

/**
 * Resultado de una operación de generación de imagen.
 */
export interface ImageGenerationResult {
  success: boolean;
  image_url?: string;
  error?: string;
}

/**
 * Configuración para la generación y almacenamiento de imágenes de exámenes.
 */
export const IMAGE_CONFIG = {
  BUCKET_NAME: 'agentic-exam-simulator-prod',
  IMAGE_PREFIX: 'exam-images/',
  CLOUDFRONT_DOMAIN: import.meta.env.VITE_CLOUDFRONT_DOMAIN,
  MODEL_ID: 'amazon.titan-image-generator-v2:0',
  IMAGE_WIDTH: 512,
  IMAGE_HEIGHT: 512,
} as const;

/**
 * Construye un prompt descriptivo para la generación de imagen a partir de
 * los metadatos del examen (nombre, proveedor y descripción).
 * Función pura.
 */
function buildImagePrompt(exam: { name: string; provider: string; description?: string }): string {
  const base = `Professional certification illustration for ${exam.name} by ${exam.provider}.`;
  const desc = exam.description ? ` ${exam.description}.` : '';
  return `${base}${desc} Clean, modern, professional style with technology-related imagery. No text or letters in the image.`;
}

/**
 * Filtra exámenes cuyo campo `image_url` sea `undefined`, `null` o cadena vacía.
 * Función pura para uso en migración batch.
 */
function filterExamsWithoutImage(exams: Exam[]): Exam[] {
  return exams.filter((exam) => !exam.image_url);
}

/**
 * Genera un string de resumen con total, éxitos y fallos de una migración.
 * Función pura.
 */
function buildMigrationSummary(results: { total: number; success: number; failed: number }): string {
  return `Migration complete: ${results.total} total, ${results.success} succeeded, ${results.failed} failed.`;
}

/**
 * Sube un buffer de imagen PNG a S3 y retorna la URL de CloudFront.
 * Usa credenciales temporales de Cognito via createS3Client().
 */
async function uploadImageToS3(examId: string, imageBuffer: Uint8Array): Promise<string> {
  const s3Client = await createS3Client();
  const key = `${IMAGE_CONFIG.IMAGE_PREFIX}${examId}.png`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: IMAGE_CONFIG.BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png',
    })
  );

  return `https://${IMAGE_CONFIG.CLOUDFRONT_DOMAIN}/${key}`;
}

/**
 * Genera una imagen para un examen usando Amazon Bedrock Titan Image Generator v2.
 * Sube la imagen a S3 y actualiza el campo image_url en DynamoDB.
 *
 * Manejo de errores:
 * - ThrottlingException: reintenta una vez después de 2 segundos.
 * - Cualquier otro error: registra en consola y retorna { success: false, error }.
 */
async function generateExamImage(exam: Exam): Promise<ImageGenerationResult> {
  async function attemptGeneration(): Promise<ImageGenerationResult> {
    const prompt = buildImagePrompt(exam);
    const client = await createBedrockClient();

    const command = new InvokeModelCommand({
      modelId: IMAGE_CONFIG.MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: { text: prompt },
        imageGenerationConfig: {
          numberOfImages: 1,
          width: IMAGE_CONFIG.IMAGE_WIDTH,
          height: IMAGE_CONFIG.IMAGE_HEIGHT,
          cfgScale: 8.0,
        },
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const base64Image: string = responseBody.images[0];
    const imageBuffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));

    const image_url = await uploadImageToS3(exam.id, imageBuffer);
    await adminService.updateExam(exam.id, { image_url });

    return { success: true, image_url };
  }

  try {
    return await attemptGeneration();
  } catch (error: unknown) {
    // Retry once on ThrottlingException
    if (error instanceof Error && error.name === 'ThrottlingException') {
      console.warn(`[imageService] ThrottlingException for exam ${exam.id}, retrying in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        return await attemptGeneration();
      } catch (retryError: unknown) {
        const message = retryError instanceof Error ? retryError.message : 'Unknown error on retry';
        console.error(`[imageService] Retry failed for exam ${exam.id}:`, retryError);
        return { success: false, error: message };
      }
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[imageService] Error generating image for exam ${exam.id}:`, error);
    return { success: false, error: message };
  }
}

export const imageService = {
  buildImagePrompt,
  filterExamsWithoutImage,
  buildMigrationSummary,
  uploadImageToS3,
  generateExamImage,
};
