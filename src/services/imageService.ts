// src/services/imageService.ts
import type { Exam } from '../types';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3Client } from './aws';
import { adminService } from './adminService';

/**
 * Resultado de una operación de subida de imagen.
 */
export interface ImageUploadResult {
  success: boolean;
  image_url?: string;
  error?: string;
}

/**
 * Configuración para el almacenamiento de imágenes de exámenes.
 */
export const IMAGE_CONFIG = {
  BUCKET_NAME: 'agentic-exam-simulator-prod',
  IMAGE_PREFIX: 'exam-images/',
  CLOUDFRONT_DOMAIN: import.meta.env.VITE_CLOUDFRONT_DOMAIN,
} as const;

/**
 * Sube un archivo de imagen a S3 y retorna la URL de CloudFront.
 * Usa credenciales temporales de Cognito via createS3Client().
 */
async function uploadImageToS3(examId: string, file: File): Promise<string> {
  const s3Client = await createS3Client();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const key = `${IMAGE_CONFIG.IMAGE_PREFIX}${examId}.${extension}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  await s3Client.send(
    new PutObjectCommand({
      Bucket: IMAGE_CONFIG.BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'image/png',
    })
  );

  return `https://${IMAGE_CONFIG.CLOUDFRONT_DOMAIN}/${key}`;
}

/**
 * Sube una imagen manualmente para un examen.
 * Sube el archivo a S3 y actualiza el campo image_url en DynamoDB.
 */
async function uploadExamImage(exam: Exam, file: File): Promise<ImageUploadResult> {
  try {
    const image_url = await uploadImageToS3(exam.id, file);
    await adminService.updateExam(exam.id, { image_url });
    return { success: true, image_url };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[imageService] Error uploading image for exam ${exam.id}:`, error);
    return { success: false, error: message };
  }
}

export const imageService = {
  uploadImageToS3,
  uploadExamImage,
};
