import { describe, it, expect } from 'vitest';
import { analyzeDomainErrors, identifyWeakDomains } from './examResultsAnalyzer';
import type { ExamAttempt, Question } from '../types';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    type: 'single_select',
    question_text: 'Test question',
    options: [{ id: 'a', text: 'A' }],
    correct_ids: ['a'],
    explanation: 'Explanation',
    domain: 'Networking',
    user_selected_ids: ['a'],
    ...overrides,
  };
}

function makeAttempt(questions: Question[], overrides: Partial<ExamAttempt> = {}): ExamAttempt {
  return {
    id: 'attempt-1',
    exam_id: 'exam-1',
    mode: 'simulator',
    difficulty: 'intermediate',
    exam_length_percentage: 100,
    total_questions_requested: questions.length,
    start_time: new Date().toISOString(),
    questions,
    status: 'completed',
    ...overrides,
  };
}

describe('analyzeDomainErrors', () => {
  it('should return empty array for empty attempts', () => {
    const result = analyzeDomainErrors([]);
    expect(result).toEqual([]);
  });

  it('should skip questions without a domain', () => {
    const questions = [
      makeQuestion({ domain: undefined, user_selected_ids: ['b'] }),
    ];
    const result = analyzeDomainErrors([makeAttempt(questions)]);
    expect(result).toEqual([]);
  });

  it('should count correct answers (exact match of user_selected_ids and correct_ids)', () => {
    const questions = [
      makeQuestion({ domain: 'Networking', correct_ids: ['a'], user_selected_ids: ['a'] }),
      makeQuestion({ id: 'q2', domain: 'Networking', correct_ids: ['a', 'b'], user_selected_ids: ['a', 'b'] }),
    ];
    const result = analyzeDomainErrors([makeAttempt(questions)]);
    expect(result).toHaveLength(1);
    expect(result[0].errorCount).toBe(0);
    expect(result[0].totalQuestions).toBe(2);
    expect(result[0].errorRate).toBe(0);
  });

  it('should count incorrect answers when user_selected_ids does not match correct_ids', () => {
    const questions = [
      makeQuestion({ domain: 'Networking', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q2', domain: 'Networking', correct_ids: ['a', 'b'], user_selected_ids: ['a'] }),
    ];
    const result = analyzeDomainErrors([makeAttempt(questions)]);
    expect(result).toHaveLength(1);
    expect(result[0].errorCount).toBe(2);
    expect(result[0].totalQuestions).toBe(2);
    expect(result[0].errorRate).toBe(1);
  });

  it('should treat missing user_selected_ids as incorrect', () => {
    const questions = [
      makeQuestion({ domain: 'Compute', correct_ids: ['a'], user_selected_ids: undefined }),
    ];
    const result = analyzeDomainErrors([makeAttempt(questions)]);
    expect(result[0].errorCount).toBe(1);
  });

  it('should aggregate across multiple attempts', () => {
    const attempt1 = makeAttempt([
      makeQuestion({ domain: 'Networking', correct_ids: ['a'], user_selected_ids: ['b'] }),
    ]);
    const attempt2 = makeAttempt([
      makeQuestion({ domain: 'Networking', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q2', domain: 'Compute', correct_ids: ['a'], user_selected_ids: ['b'] }),
    ], { id: 'attempt-2' });

    const result = analyzeDomainErrors([attempt1, attempt2]);
    expect(result).toHaveLength(2);
    // Networking has 2 errors, Compute has 1
    expect(result[0].domain).toBe('Networking');
    expect(result[0].errorCount).toBe(2);
    expect(result[1].domain).toBe('Compute');
    expect(result[1].errorCount).toBe(1);
  });

  it('should sort results descending by errorCount', () => {
    const questions = [
      makeQuestion({ id: 'q1', domain: 'Storage', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q2', domain: 'Networking', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q3', domain: 'Networking', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q4', domain: 'Networking', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q5', domain: 'Compute', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q6', domain: 'Compute', correct_ids: ['a'], user_selected_ids: ['b'] }),
    ];
    const result = analyzeDomainErrors([makeAttempt(questions)]);
    expect(result[0].domain).toBe('Networking');
    expect(result[0].errorCount).toBe(3);
    expect(result[1].domain).toBe('Compute');
    expect(result[1].errorCount).toBe(2);
    expect(result[2].domain).toBe('Storage');
    expect(result[2].errorCount).toBe(1);
  });

  it('should compute errorRate as errorCount / totalQuestions', () => {
    const questions = [
      makeQuestion({ id: 'q1', domain: 'Security', correct_ids: ['a'], user_selected_ids: ['b'] }),
      makeQuestion({ id: 'q2', domain: 'Security', correct_ids: ['a'], user_selected_ids: ['a'] }),
      makeQuestion({ id: 'q3', domain: 'Security', correct_ids: ['a'], user_selected_ids: ['a'] }),
      makeQuestion({ id: 'q4', domain: 'Security', correct_ids: ['a'], user_selected_ids: ['b'] }),
    ];
    const result = analyzeDomainErrors([makeAttempt(questions)]);
    expect(result[0].errorRate).toBe(0.5); // 2 errors / 4 total
  });

  it('should require exact match including both directions for multi-select', () => {
    const questions = [
      // user selected a superset - should be incorrect
      makeQuestion({ id: 'q1', domain: 'Database', correct_ids: ['a'], user_selected_ids: ['a', 'b'] }),
      // user selected correct set but in different order - should be correct
      makeQuestion({ id: 'q2', domain: 'Database', correct_ids: ['a', 'b'], user_selected_ids: ['b', 'a'] }),
    ];
    const result = analyzeDomainErrors([makeAttempt(questions)]);
    expect(result[0].errorCount).toBe(1); // only q1 is wrong
    expect(result[0].totalQuestions).toBe(2);
  });
});

describe('identifyWeakDomains', () => {
  it('should return empty array for empty input', () => {
    const result = identifyWeakDomains([]);
    expect(result).toEqual([]);
  });

  it('should return top N domains by default (3)', () => {
    const domainErrors = [
      { domain: 'A', errorCount: 10, totalQuestions: 20, errorRate: 0.5 },
      { domain: 'B', errorCount: 8, totalQuestions: 15, errorRate: 0.53 },
      { domain: 'C', errorCount: 5, totalQuestions: 10, errorRate: 0.5 },
      { domain: 'D', errorCount: 2, totalQuestions: 10, errorRate: 0.2 },
    ];
    const result = identifyWeakDomains(domainErrors);
    expect(result).toHaveLength(3);
    expect(result[0].domain).toBe('A');
    expect(result[1].domain).toBe('B');
    expect(result[2].domain).toBe('C');
  });

  it('should respect custom maxDomains parameter', () => {
    const domainErrors = [
      { domain: 'A', errorCount: 10, totalQuestions: 20, errorRate: 0.5 },
      { domain: 'B', errorCount: 8, totalQuestions: 15, errorRate: 0.53 },
      { domain: 'C', errorCount: 5, totalQuestions: 10, errorRate: 0.5 },
    ];
    const result = identifyWeakDomains(domainErrors, 2);
    expect(result).toHaveLength(2);
  });

  it('should return all domains if fewer than maxDomains exist', () => {
    const domainErrors = [
      { domain: 'A', errorCount: 10, totalQuestions: 20, errorRate: 0.5 },
    ];
    const result = identifyWeakDomains(domainErrors, 3);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe('A');
  });
});
