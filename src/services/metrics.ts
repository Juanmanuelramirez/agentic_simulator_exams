/**
 * Performance metrics service for tracking question generation performance.
 * Logs metrics to the console and stores them in memory for monitoring.
 */

export interface GenerationMetric {
  examId: string;
  attemptId?: string;
  firstBlockDurationMs: number;
  totalDurationMs?: number;
  questionsGenerated: number;
  questionsFailed: number;
  bedrockLatencies: number[]; // per-question latency in ms
  timestamp: string;
}

const metrics: GenerationMetric[] = [];

export const metricsService = {
  /**
   * Record the time taken to generate the first block of questions.
   */
  recordFirstBlockTime(examId: string, durationMs: number, questionsGenerated: number): void {
    console.info(
      `[METRICS] First block: examId=${examId}, duration=${(durationMs / 1000).toFixed(2)}s, questions=${questionsGenerated}`
    );
    if (durationMs > 30_000) {
      console.warn(`[METRICS] First block exceeded 30s target: ${(durationMs / 1000).toFixed(2)}s`);
    }
  },

  /**
   * Record total generation time for a complete exam generation.
   */
  recordTotalGenerationTime(examId: string, durationMs: number, generated: number, failed: number): void {
    console.info(
      `[METRICS] Total generation: examId=${examId}, duration=${(durationMs / 1000).toFixed(2)}s, ` +
      `generated=${generated}, failed=${failed}, ` +
      `avg=${generated > 0 ? (durationMs / generated / 1000).toFixed(2) : 'N/A'}s/question`
    );
  },

  /**
   * Record a single Bedrock API call latency.
   */
  recordBedrockLatency(examId: string, latencyMs: number, domain: string): void {
    if (latencyMs > 5000) {
      console.warn(`[METRICS] High Bedrock latency: ${latencyMs}ms for domain "${domain}" (examId=${examId})`);
    }
  },

  /**
   * Store a full generation metric record.
   */
  record(metric: GenerationMetric): void {
    metrics.push(metric);
    metricsService.recordTotalGenerationTime(
      metric.examId,
      metric.totalDurationMs ?? metric.firstBlockDurationMs,
      metric.questionsGenerated,
      metric.questionsFailed
    );
    if (metric.bedrockLatencies.length > 0) {
      const avg = metric.bedrockLatencies.reduce((a, b) => a + b, 0) / metric.bedrockLatencies.length;
      console.info(`[METRICS] Avg Bedrock latency: ${avg.toFixed(0)}ms over ${metric.bedrockLatencies.length} calls`);
    }
  },

  /** Get all recorded metrics (for admin monitoring). */
  getAll(): GenerationMetric[] {
    return [...metrics];
  },

  /** Get error rate across all recorded metrics. */
  getErrorRate(): number {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.questionsGenerated + m.questionsFailed, 0);
    const failed = metrics.reduce((sum, m) => sum + m.questionsFailed, 0);
    return total > 0 ? (failed / total) * 100 : 0;
  },
};
