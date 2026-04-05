import { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import type { GenerationJob } from '../types';

interface UseGenerationPollingResult {
  job: GenerationJob | null;
  isPolling: boolean;
  error: string | null;
  stopPolling: () => void;
}

/**
 * Hook that polls a generation job status every 2 seconds.
 * Stops automatically when the job reaches a terminal state (completed/failed).
 */
export function useGenerationPolling(jobId: string | null): UseGenerationPollingResult {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  };

  useEffect(() => {
    if (!jobId) {
      stopPolling();
      setJob(null);
      return;
    }

    setIsPolling(true);
    setError(null);

    const poll = async () => {
      try {
        const result = await dbService.getGenerationJob(jobId);
        if (result) {
          setJob(result);
          // Stop polling on terminal states
          if (result.status === 'completed' || result.status === 'failed') {
            stopPolling();
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al obtener el estado del job.');
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => stopPolling();
  }, [jobId]);

  return { job, isPolling, error, stopPolling };
}
