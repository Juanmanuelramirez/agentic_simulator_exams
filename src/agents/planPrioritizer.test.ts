import { describe, it, expect } from 'vitest';
import { prioritizePlan, DayAssignment } from './planPrioritizer';
import type { DomainErrorRate } from './examResultsAnalyzer';

function makeDomainError(domain: string, errorCount: number, totalQuestions: number = 20): DomainErrorRate {
  return {
    domain,
    errorCount,
    totalQuestions,
    errorRate: totalQuestions > 0 ? errorCount / totalQuestions : 0,
  };
}

describe('prioritizePlan', () => {
  describe('basic behavior', () => {
    it('should return exactly totalDays assignments', () => {
      const weakDomains = [makeDomainError('Networking', 10)];
      const allDomains = ['Networking', 'Compute', 'Storage'];
      const result = prioritizePlan(weakDomains, allDomains, 7);
      expect(result).toHaveLength(7);
    });

    it('should return assignments sorted by day (1 through totalDays)', () => {
      const weakDomains = [makeDomainError('Networking', 10), makeDomainError('Compute', 5)];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security'];
      const result = prioritizePlan(weakDomains, allDomains, 7);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].day).toBe(i + 1);
      }
    });

    it('should return empty array when totalDays is 0', () => {
      const result = prioritizePlan([], ['A', 'B'], 0);
      expect(result).toEqual([]);
    });

    it('should mark weak domain assignments with isWeakDomain=true', () => {
      const weakDomains = [makeDomainError('Networking', 10)];
      const allDomains = ['Networking', 'Compute', 'Storage'];
      const result = prioritizePlan(weakDomains, allDomains, 7);
      const weakAssignments = result.filter(a => a.domain === 'Networking');
      expect(weakAssignments.every(a => a.isWeakDomain)).toBe(true);
    });

    it('should mark non-weak domain assignments with isWeakDomain=false', () => {
      const weakDomains = [makeDomainError('Networking', 10)];
      const allDomains = ['Networking', 'Compute', 'Storage'];
      const result = prioritizePlan(weakDomains, allDomains, 7);
      const nonWeakAssignments = result.filter(a => a.domain !== 'Networking');
      expect(nonWeakAssignments.every(a => !a.isWeakDomain)).toBe(true);
    });
  });

  describe('Rule 1: Highest error domain assigned to earliest days', () => {
    it('should assign the domain with highest errors to day 1', () => {
      const weakDomains = [
        makeDomainError('Networking', 10),
        makeDomainError('Compute', 5),
        makeDomainError('Storage', 2),
      ];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security'];
      const result = prioritizePlan(weakDomains, allDomains, 7);
      expect(result[0].domain).toBe('Networking');
    });

    it('should assign domains in descending error order to earliest days', () => {
      const weakDomains = [
        makeDomainError('Networking', 10),
        makeDomainError('Compute', 5),
        makeDomainError('Storage', 2),
      ];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security'];
      const result = prioritizePlan(weakDomains, allDomains, 7);

      // Find earliest day for each weak domain
      const earliestDay = (domain: string) => {
        const assignment = result.find(a => a.domain === domain);
        return assignment ? assignment.day : Infinity;
      };

      expect(earliestDay('Networking')).toBeLessThan(earliestDay('Compute'));
      expect(earliestDay('Compute')).toBeLessThan(earliestDay('Storage'));
    });
  });

  describe('Rule 2: Equal error counts distributed evenly across first half', () => {
    it('should distribute tied domains across the first half of the plan', () => {
      const weakDomains = [
        makeDomainError('Networking', 5),
        makeDomainError('Compute', 5),
      ];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security'];
      const result = prioritizePlan(weakDomains, allDomains, 7);

      const firstHalf = Math.ceil(7 / 2); // 4
      const weakInFirstHalf = result
        .filter(a => a.day <= firstHalf && a.isWeakDomain);

      // Both tied domains should appear in the first half
      const domainsInFirstHalf = new Set(weakInFirstHalf.map(a => a.domain));
      expect(domainsInFirstHalf.has('Networking')).toBe(true);
      expect(domainsInFirstHalf.has('Compute')).toBe(true);
    });

    it('should distribute three tied domains across first half', () => {
      const weakDomains = [
        makeDomainError('Networking', 5),
        makeDomainError('Compute', 5),
        makeDomainError('Storage', 5),
      ];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security', 'Database'];
      const result = prioritizePlan(weakDomains, allDomains, 7);

      const firstHalf = Math.ceil(7 / 2); // 4
      const weakInFirstHalf = result
        .filter(a => a.day <= firstHalf && a.isWeakDomain);

      const domainsInFirstHalf = new Set(weakInFirstHalf.map(a => a.domain));
      expect(domainsInFirstHalf.has('Networking')).toBe(true);
      expect(domainsInFirstHalf.has('Compute')).toBe(true);
      expect(domainsInFirstHalf.has('Storage')).toBe(true);
    });
  });

  describe('Rule 3: Domain with >2x errors of next weakest gets at least 2 days', () => {
    it('should allocate at least 2 days when domain has >2x errors of next', () => {
      const weakDomains = [
        makeDomainError('Networking', 10), // >2x of 4
        makeDomainError('Compute', 4),
      ];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security'];
      const result = prioritizePlan(weakDomains, allDomains, 7);

      const networkingDays = result.filter(a => a.domain === 'Networking');
      expect(networkingDays.length).toBeGreaterThanOrEqual(2);
    });

    it('should NOT allocate extra days when domain has exactly 2x errors', () => {
      const weakDomains = [
        makeDomainError('Networking', 8), // exactly 2x of 4, not >2x
        makeDomainError('Compute', 4),
      ];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security'];
      const result = prioritizePlan(weakDomains, allDomains, 7);

      const networkingDays = result.filter(a => a.domain === 'Networking');
      // With exactly 2x, Rule 3 does not apply, so 1 day is standard
      expect(networkingDays.length).toBe(1);
    });

    it('should allocate 2 days for dominant domain with >2x errors', () => {
      const weakDomains = [
        makeDomainError('Networking', 15), // >2x of 6
        makeDomainError('Compute', 6),
        makeDomainError('Storage', 3),
      ];
      const allDomains = ['Networking', 'Compute', 'Storage', 'Security', 'Database'];
      const result = prioritizePlan(weakDomains, allDomains, 7);

      const networkingDays = result.filter(a => a.domain === 'Networking');
      expect(networkingDays.length).toBeGreaterThanOrEqual(2);
      // And those days should be the earliest
      expect(networkingDays[0].day).toBe(1);
      expect(networkingDays[1].day).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should distribute allDomains evenly when weakDomains is empty', () => {
      const allDomains = ['Networking', 'Compute', 'Storage'];
      const result = prioritizePlan([], allDomains, 7);
      expect(result).toHaveLength(7);
      // Should cycle through domains
      expect(result[0].domain).toBe('Networking');
      expect(result[1].domain).toBe('Compute');
      expect(result[2].domain).toBe('Storage');
      expect(result[3].domain).toBe('Networking');
    });

    it('should return empty array when both weakDomains and allDomains are empty', () => {
      const result = prioritizePlan([], [], 7);
      expect(result).toEqual([]);
    });

    it('should use weak domains to fill remaining days when no non-weak domains available', () => {
      const weakDomains = [
        makeDomainError('Networking', 10),
        makeDomainError('Compute', 5),
      ];
      // allDomains only contains weak domains
      const allDomains = ['Networking', 'Compute'];
      const result = prioritizePlan(weakDomains, allDomains, 7);
      expect(result).toHaveLength(7);
      // All assignments should be weak domains
      expect(result.every(a => a.isWeakDomain)).toBe(true);
    });

    it('should handle single weak domain', () => {
      const weakDomains = [makeDomainError('Networking', 10)];
      const allDomains = ['Networking', 'Compute', 'Storage'];
      const result = prioritizePlan(weakDomains, allDomains, 7);
      expect(result).toHaveLength(7);
      expect(result[0].domain).toBe('Networking');
      expect(result[0].isWeakDomain).toBe(true);
    });

    it('should handle totalDays = 1', () => {
      const weakDomains = [makeDomainError('Networking', 10)];
      const allDomains = ['Networking', 'Compute'];
      const result = prioritizePlan(weakDomains, allDomains, 1);
      expect(result).toHaveLength(1);
      expect(result[0].day).toBe(1);
      expect(result[0].domain).toBe('Networking');
      expect(result[0].isWeakDomain).toBe(true);
    });
  });
});
