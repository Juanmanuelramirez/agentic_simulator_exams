/**
 * Error monitoring service for tracking generation failures and retry attempts.
 * Alerts when failure rates exceed acceptable thresholds.
 */

export interface GenerationFailure {
  examId: string;
  domain: string;
  questionIndex: number;
  error: string;
  retryAttempts: number;
  timestamp: string;
}

const FAILURE_RATE_THRESHOLD = 5; // Alert if error rate exceeds 5%

const failures: GenerationFailure[] = [];
let totalAttempts = 0;

export const errorMonitor = {
  /**
   * Log a generation failure and check if alert threshold is exceeded.
   */
  logFailure(failure: Omit<GenerationFailure, 'timestamp'>): void {
    const record: GenerationFailure = { ...failure, timestamp: new Date().toISOString() };
    failures.push(record);
    totalAttempts++;

    console.error(
      `[ERROR_MONITOR] Generation failure: examId=${failure.examId}, ` +
      `domain="${failure.domain}", question=${failure.questionIndex}, ` +
      `retries=${failure.retryAttempts}, error="${failure.error}"`
    );

    const rate = errorMonitor.getFailureRate();
    if (rate > FAILURE_RATE_THRESHOLD) {
      console.warn(
        `[ERROR_MONITOR] ⚠️ High failure rate alert: ${rate.toFixed(1)}% exceeds ${FAILURE_RATE_THRESHOLD}% threshold. ` +
        `Total failures: ${failures.length}/${totalAttempts}`
      );
    }
  },

  /**
   * Log a retry attempt.
   */
  logRetry(examId: string, domain: string, attempt: number, maxAttempts: number, error: string): void {
    console.warn(
      `[ERROR_MONITOR] Retry ${attempt}/${maxAttempts}: examId=${examId}, domain="${domain}", error="${error}"`
    );
  },

  /**
   * Record a successful generation (for rate calculation).
   */
  logSuccess(): void {
    totalAttempts++;
  },

  /**
   * Get current failure rate as a percentage.
   */
  getFailureRate(): number {
    if (totalAttempts === 0) return 0;
    return (failures.length / totalAttempts) * 100;
  },

  /**
   * Get all recorded failures.
   */
  getFailures(): GenerationFailure[] {
    return [...failures];
  },

  /**
   * Get failures grouped by domain.
   */
  getFailuresByDomain(): Record<string, number> {
    return failures.reduce((acc, f) => {
      acc[f.domain] = (acc[f.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Reset all counters (useful for testing).
   */
  reset(): void {
    failures.length = 0;
    totalAttempts = 0;
  },
};
