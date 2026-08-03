import type { ExamAttempt } from '../types';

export interface DomainErrorRate {
  domain: string;
  errorCount: number;
  totalQuestions: number;
  errorRate: number; // errorCount / totalQuestions
}

/**
 * Processes all questions across attempts, computes per-domain error counts,
 * and returns sorted descending by errorCount.
 *
 * A question is considered incorrect when user_selected_ids doesn't match
 * correct_ids exactly (same length and same elements).
 * Questions without a domain field are skipped.
 */
export function analyzeDomainErrors(attempts: ExamAttempt[]): DomainErrorRate[] {
  if (attempts.length === 0) {
    return [];
  }

  const domainStats: Record<string, { errorCount: number; totalQuestions: number }> = {};

  for (const attempt of attempts) {
    for (const question of attempt.questions) {
      // Skip questions without a domain
      if (!question.domain) {
        continue;
      }

      const domain = question.domain;

      if (!domainStats[domain]) {
        domainStats[domain] = { errorCount: 0, totalQuestions: 0 };
      }

      domainStats[domain].totalQuestions += 1;

      // A question is incorrect when user_selected_ids doesn't match correct_ids exactly
      const isCorrect =
        question.user_selected_ids != null &&
        question.user_selected_ids.length === question.correct_ids.length &&
        question.user_selected_ids.every(id => question.correct_ids.includes(id)) &&
        question.correct_ids.every(id => question.user_selected_ids!.includes(id));

      if (!isCorrect) {
        domainStats[domain].errorCount += 1;
      }
    }
  }

  const results: DomainErrorRate[] = Object.entries(domainStats).map(
    ([domain, stats]) => ({
      domain,
      errorCount: stats.errorCount,
      totalQuestions: stats.totalQuestions,
      errorRate: stats.totalQuestions > 0 ? stats.errorCount / stats.totalQuestions : 0,
    })
  );

  // Sort descending by errorCount
  results.sort((a, b) => b.errorCount - a.errorCount);

  return results;
}

/**
 * Returns top N domains by error count from the sorted domain errors list.
 */
export function identifyWeakDomains(
  domainErrors: DomainErrorRate[],
  maxDomains: number = 3
): DomainErrorRate[] {
  return domainErrors.slice(0, maxDomains);
}
