/**
 * Migration script: Generate images for all exams that don't have one.
 *
 * Executable with: npx tsx scripts/migrate-exam-images.ts
 *
 * Required environment variables (from .env.production or shell):
 *   VITE_AWS_ACCESS_KEY_ID
 *   VITE_AWS_SECRET_ACCESS_KEY
 *   VITE_AWS_REGION
 *   VITE_CLOUDFRONT_DOMAIN
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── Configuration ────────────────────────────────────────────────────────────

const TABLE_NAME = "ExamSimulator-Simulators";
const BUCKET_NAME = "agentic-exam-simulator-prod";
const IMAGE_PREFIX = "exam-images/";
const MODEL_ID = "amazon.titan-image-generator-v2:0";
const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;
const DELAY_MS = 2000;

const REGION = process.env.VITE_AWS_REGION || "us-east-1";
const CLOUDFRONT_DOMAIN = process.env.VITE_CLOUDFRONT_DOMAIN;

const CREDENTIALS = {
  accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || "dummy",
  secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || "dummy",
};

// ── AWS Clients ──────────────────────────────────────────────────────────────

const dbClient = new DynamoDBClient({ region: REGION, credentials: CREDENTIALS });
const docClient = DynamoDBDocumentClient.from(dbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const bedrockClient = new BedrockRuntimeClient({ region: REGION, credentials: CREDENTIALS });

const s3Client = new S3Client({ region: REGION, credentials: CREDENTIALS });

// ── Exam type (minimal, self-contained) ──────────────────────────────────────

interface ExamRecord {
  id: string;
  name: string;
  provider: string;
  description?: string;
  image_url?: string;
  [key: string]: unknown;
}

// ── Pure helper functions (inlined from imageService) ────────────────────────

function buildImagePrompt(exam: { name: string; provider: string; description?: string }): string {
  const base = `Professional certification illustration for ${exam.name} by ${exam.provider}.`;
  const desc = exam.description ? ` ${exam.description}.` : "";
  return `${base}${desc} Clean, modern, professional style with technology-related imagery. No text or letters in the image.`;
}

function filterExamsWithoutImage(exams: ExamRecord[]): ExamRecord[] {
  return exams.filter((exam) => !exam.image_url);
}

function buildMigrationSummary(results: { total: number; success: number; failed: number }): string {
  return `Migration complete: ${results.total} total, ${results.success} succeeded, ${results.failed} failed.`;
}

// ── Core operations ──────────────────────────────────────────────────────────

async function scanAllExams(): Promise<ExamRecord[]> {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return (result.Items as ExamRecord[]) || [];
}

async function uploadImageToS3(examId: string, imageBuffer: Uint8Array): Promise<string> {
  const key = `${IMAGE_PREFIX}${examId}.png`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: "image/png",
    })
  );
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

async function updateExamImageUrl(exam: ExamRecord, imageUrl: string): Promise<void> {
  const updatedItem = {
    ...exam,
    image_url: imageUrl,
    updated_at: new Date().toISOString(),
  };
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updatedItem,
    })
  );
}

async function generateExamImage(exam: ExamRecord): Promise<void> {
  const prompt = buildImagePrompt(exam);

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      taskType: "TEXT_IMAGE",
      textToImageParams: { text: prompt },
      imageGenerationConfig: {
        numberOfImages: 1,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        cfgScale: 8.0,
      },
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const base64Image: string = responseBody.images[0];

  // Decode base64 to binary buffer
  const binaryString = Buffer.from(base64Image, "base64");
  const imageBuffer = new Uint8Array(binaryString);

  // Upload to S3 and get CloudFront URL
  const imageUrl = await uploadImageToS3(exam.id, imageBuffer);

  // Update exam record in DynamoDB
  await updateExamImageUrl(exam, imageUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main migration ───────────────────────────────────────────────────────────

async function migrate(): Promise<void> {
  console.log("🖼️  Starting exam image migration...\n");

  if (!CLOUDFRONT_DOMAIN || CLOUDFRONT_DOMAIN === "YOUR_CLOUDFRONT_DOMAIN") {
    console.error("❌ VITE_CLOUDFRONT_DOMAIN is not set. Please configure it before running this script.");
    process.exit(1);
  }

  // 1. Scan all exams
  const allExams = await scanAllExams();
  console.log(`Found ${allExams.length} total exams.`);

  // 2. Filter exams without image
  const examsWithoutImage = filterExamsWithoutImage(allExams);
  console.log(`${examsWithoutImage.length} exams need image generation.\n`);

  if (examsWithoutImage.length === 0) {
    console.log("✅ All exams already have images. Nothing to do.");
    return;
  }

  // 3. Process each exam sequentially
  let success = 0;
  let failed = 0;

  for (let i = 0; i < examsWithoutImage.length; i++) {
    const exam = examsWithoutImage[i];
    const progress = `[${i + 1}/${examsWithoutImage.length}]`;

    try {
      console.log(`${progress} Generating image for: ${exam.name} (${exam.id})...`);
      await generateExamImage(exam);
      console.log(`${progress} ✓ Success: ${exam.id}`);
      success++;
    } catch (error) {
      console.error(`${progress} ✗ Failed for exam ${exam.id}:`, error instanceof Error ? error.message : error);
      failed++;
    }

    // Wait 2 seconds between invocations (skip after the last one)
    if (i < examsWithoutImage.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // 4. Print summary
  const summary = buildMigrationSummary({
    total: examsWithoutImage.length,
    success,
    failed,
  });
  console.log(`\n${summary}`);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
