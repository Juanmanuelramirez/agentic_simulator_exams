import type { DomainErrorRate } from './examResultsAnalyzer';

export interface DayAssignment {
  day: number;
  domain: string;
  isWeakDomain: boolean;
}

/**
 * Prioritizes a study plan by assigning domains to days based on weakness severity.
 *
 * Rules:
 * 1. Highest error domain → earliest days
 * 2. Equal error counts → even distribution across first half of plan
 * 3. Domain with >2x errors of next weakest → allocate at least 2 days
 *
 * @param weakDomains - Sorted descending by errorCount (from identifyWeakDomains)
 * @param allDomains - All available domains for the exam
 * @param totalDays - Total days in the plan (default 7)
 * @returns Array of DayAssignment sorted by day number (1 through totalDays)
 */
export function prioritizePlan(
  weakDomains: DomainErrorRate[],
  allDomains: string[],
  totalDays: number = 7
): DayAssignment[] {
  if (totalDays <= 0) {
    return [];
  }

  // If no weak domains, distribute allDomains evenly
  if (weakDomains.length === 0) {
    return distributeDomainsEvenly(allDomains, totalDays, false);
  }

  // Calculate how many days each weak domain gets
  const weakDomainDays = allocateWeakDomainDays(weakDomains, totalDays);

  // Build assignments for weak domains
  const assignments: DayAssignment[] = [];
  let currentDay = 1;

  for (const { domain, days } of weakDomainDays) {
    for (let i = 0; i < days && currentDay <= totalDays; i++) {
      assignments.push({
        day: currentDay,
        domain,
        isWeakDomain: true,
      });
      currentDay++;
    }
  }

  // Fill remaining days with non-weak domains from allDomains
  const weakDomainNames = new Set(weakDomains.map(w => w.domain));
  const nonWeakDomains = allDomains.filter(d => !weakDomainNames.has(d));

  if (currentDay <= totalDays) {
    const remainingDays = totalDays - currentDay + 1;

    if (nonWeakDomains.length > 0) {
      // Distribute non-weak domains across remaining days
      for (let i = 0; i < remainingDays; i++) {
        const domain = nonWeakDomains[i % nonWeakDomains.length];
        assignments.push({
          day: currentDay,
          domain,
          isWeakDomain: false,
        });
        currentDay++;
      }
    } else {
      // No non-weak domains available, cycle through weak domains again
      const weakDomainList = weakDomains.map(w => w.domain);
      for (let i = 0; i < remainingDays; i++) {
        const domain = weakDomainList[i % weakDomainList.length];
        assignments.push({
          day: currentDay,
          domain,
          isWeakDomain: true,
        });
        currentDay++;
      }
    }
  }

  // Sort by day number
  assignments.sort((a, b) => a.day - b.day);

  return assignments;
}

interface DomainDayAllocation {
  domain: string;
  days: number;
}

/**
 * Allocates days to weak domains based on the prioritization rules.
 */
function allocateWeakDomainDays(
  weakDomains: DomainErrorRate[],
  totalDays: number
): DomainDayAllocation[] {
  // Maximum days to allocate to weak domains: use at most ceil(totalDays * 0.7)
  // to leave room for non-weak domains, but if there are many weak domains
  // we may need all days
  const maxWeakDays = Math.min(totalDays, Math.max(weakDomains.length, Math.ceil(totalDays * 0.7)));

  // Group domains by error count for Rule 2 (equal error handling)
  const groups = groupByErrorCount(weakDomains);

  // First pass: determine base allocation
  const allocations: DomainDayAllocation[] = [];
  let daysUsed = 0;

  for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
    const group = groups[groupIdx];

    if (daysUsed >= maxWeakDays) break;

    const remainingDays = maxWeakDays - daysUsed;

    if (group.length === 1) {
      const domain = group[0];
      // Rule 3: Check if this domain has >2x errors of the next weakest
      const nextGroup = groups[groupIdx + 1];
      const nextWeakestErrorCount = nextGroup ? nextGroup[0].errorCount : 0;

      let daysForDomain: number;
      if (nextWeakestErrorCount > 0 && domain.errorCount > 2 * nextWeakestErrorCount) {
        // Rule 3: Allocate at least 2 days
        daysForDomain = Math.min(Math.max(2, 1), remainingDays);
        daysForDomain = Math.min(2, remainingDays);
        if (remainingDays >= 2) {
          daysForDomain = 2;
        } else {
          daysForDomain = remainingDays;
        }
      } else {
        // Standard allocation: 1 day
        daysForDomain = Math.min(1, remainingDays);
      }

      allocations.push({ domain: domain.domain, days: daysForDomain });
      daysUsed += daysForDomain;
    } else {
      // Rule 2: Equal error counts - distribute evenly across first half
      const firstHalf = Math.ceil(totalDays / 2);
      const availableFirstHalfSlots = Math.max(0, firstHalf - daysUsed);
      const slotsPerDomain = Math.max(1, Math.floor(availableFirstHalfSlots / group.length));

      for (const domain of group) {
        if (daysUsed >= maxWeakDays) break;
        const daysForDomain = Math.min(slotsPerDomain, maxWeakDays - daysUsed);
        if (daysForDomain > 0) {
          allocations.push({ domain: domain.domain, days: daysForDomain });
          daysUsed += daysForDomain;
        }
      }
    }
  }

  // If Rule 3 wasn't fully satisfied, do a second pass
  // Check if the strongest domain needs 2 days but only got 1
  if (allocations.length > 0 && weakDomains.length >= 2) {
    const strongest = weakDomains[0];
    const nextStrongest = weakDomains[1];

    if (strongest.errorCount > 2 * nextStrongest.errorCount) {
      const strongestAlloc = allocations.find(a => a.domain === strongest.domain);
      if (strongestAlloc && strongestAlloc.days < 2 && daysUsed < maxWeakDays) {
        strongestAlloc.days = 2;
        daysUsed++;
      }
    }
  }

  return allocations;
}

/**
 * Groups weak domains by their error count (for Rule 2 handling).
 * Returns groups in descending order of error count.
 */
function groupByErrorCount(domains: DomainErrorRate[]): DomainErrorRate[][] {
  const groups: DomainErrorRate[][] = [];
  let currentGroup: DomainErrorRate[] = [];
  let currentCount = -1;

  for (const domain of domains) {
    if (domain.errorCount !== currentCount) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [domain];
      currentCount = domain.errorCount;
    } else {
      currentGroup.push(domain);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Distributes domains evenly across the given number of days.
 * Used when no weak domains are identified.
 */
function distributeDomainsEvenly(
  domains: string[],
  totalDays: number,
  isWeak: boolean
): DayAssignment[] {
  if (domains.length === 0) {
    return [];
  }

  const assignments: DayAssignment[] = [];
  for (let day = 1; day <= totalDays; day++) {
    assignments.push({
      day,
      domain: domains[(day - 1) % domains.length],
      isWeakDomain: isWeak,
    });
  }

  return assignments;
}
