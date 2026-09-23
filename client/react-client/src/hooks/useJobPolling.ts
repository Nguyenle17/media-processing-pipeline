import { useState, useCallback, useRef } from 'react';
import Api from '../api/Api';

interface PollOptions {
  onProgress?: (pct: number, job: any) => number;
  resultField?: string;
}

interface UseJobPollingOptions {
  pollInterval?: number;
  idleTimeout?: number;
}

export function useJobPolling({
  pollInterval = 5000,
  idleTimeout = 10 * 60 * 1000,
}: UseJobPollingOptions = {}) {
  const [status, setStatus] = useState('');
  const [percentage, setPercentage] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const cancelledRef = useRef(false);

  const poll = useCallback(
    async (jobId: string, opts: PollOptions = {}): Promise<string> => {
      const { onProgress, resultField = 'transcriptText' } = opts;
      cancelledRef.current = false;
      setIsPolling(true);
      setPercentage(0);
      setStatus('Waiting in queue...');
      let lastActivity = Date.now();

      try {
        for (;;) {
          if (cancelledRef.current) throw new Error('Polling cancelled');
          await new Promise((r) => setTimeout(r, pollInterval));

          const job = await Api.get(`/job/process/${jobId}`);

          switch (job.status) {
            case 'waiting':
              setStatus('Waiting in queue...');
              setPercentage(0);
              lastActivity = Date.now();
              break;

            case 'processing':
              lastActivity = new Date(job.updatedAt).getTime();
              if (job.processedChunks && job.totalChunks) {
                const raw = (job.processedChunks / job.totalChunks) * 100;
                const pct = Math.round(5 + raw * 0.8);
                setPercentage(onProgress ? onProgress(pct, job) : pct);
                setStatus(`Transcribing... ${job.processedChunks}/${job.totalChunks} chunks`);
              } else {
                setPercentage((p) => (p < 5 ? 5 : p));
                setStatus('Processing...');
              }
              break;

            case 'translating':
              lastActivity = Date.now();
              setPercentage(88);
              setStatus('Translating...');
              break;

            case 'completed': {
              const result = await Api.get(`/job/result/${jobId}`);
              setPercentage(100);
              setStatus('Done!');
              return (
                result[resultField] ||
                result.translatedText ||
                result.transcriptText ||
                result.resultText ||
                ''
              );
            }

            case 'failed':
              throw new Error('Job failed on server');
          }

          if (Date.now() - lastActivity > idleTimeout) {
            throw new Error('Job timed out — no activity for 10 minutes');
          }
        }
      } finally {
        setIsPolling(false);
      }
    },
    [pollInterval, idleTimeout]
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setStatus('');
    setPercentage(0);
    setIsPolling(false);
    cancelledRef.current = false;
  }, []);

  return {
    poll,
    cancel,
    reset,
    status,
    percentage,
    isPolling,
    setStatus,
    setPercentage,
  };
}