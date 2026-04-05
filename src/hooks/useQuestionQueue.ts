import { useState, useCallback } from 'react';
import type { Question } from '../types';

interface UseQuestionQueueResult {
  queue: Question[];
  currentIndex: number;
  currentQuestion: Question | null;
  isLoadingMore: boolean;
  hasMore: boolean;
  addQuestions: (questions: Question[]) => void;
  advance: () => void;
}

/**
 * Manages a queue of questions during an exam.
 * Serves questions from the first block and loads more as they become available.
 */
export function useQuestionQueue(initialQuestions: Question[], totalRequested: number): UseQuestionQueueResult {
  const [queue, setQueue] = useState<Question[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLoadingMore = queue.length < totalRequested;
  const hasMore = currentIndex < queue.length - 1;
  const currentQuestion = queue[currentIndex] ?? null;

  const addQuestions = useCallback((newQuestions: Question[]) => {
    setQueue(prev => {
      const existingIds = new Set(prev.map(q => q.id));
      const unique = newQuestions.filter(q => !existingIds.has(q.id));
      return [...prev, ...unique];
    });
  }, []);

  const advance = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, queue.length - 1));
  }, [queue.length]);

  return {
    queue,
    currentIndex,
    currentQuestion,
    isLoadingMore,
    hasMore,
    addQuestions,
    advance,
  };
}
