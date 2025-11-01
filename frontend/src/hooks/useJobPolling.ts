import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import type { JobStatus } from '@/types';

interface JobStatusResponse {
  status: JobStatus;
  progress?: number;
  message?: string;
  error?: string;
}

export const useJobPolling = (jobId: string | null, interval = 3000) => {
  const [status, setStatus] = useState<JobStatus>('queued');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus('queued');
      setProgress(0);
      setMessage('');
      setError(null);
      setIsDone(false);
      return;
    }

    const pollStatus = async () => {
      try {
        const data: JobStatusResponse = await api.getJobStatus(jobId);
        setStatus(data.status);
        setProgress(data.progress || 0);
        setMessage(data.message || '');
        
        if (data.error) {
          setError(data.error);
        }

        // Stop polling when job is done or failed
        if (data.status === 'done' || data.status === 'ready' || data.status === 'failed') {
          setIsDone(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        setError('Failed to fetch job status');
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval
    intervalRef.current = setInterval(pollStatus, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, interval]);

  return { status, progress, message, error, isDone };
};
