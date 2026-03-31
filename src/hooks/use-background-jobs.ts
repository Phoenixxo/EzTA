import { useEffect, useState } from "react";
import {
  dismissBackgroundJob,
  getBackgroundJob,
  listBackgroundJobs,
} from "../lib/ezta";
import type { BackgroundJob } from "../types/ezta";

type UseBackgroundJobMonitorOptions<T> = {
  jobId: number | null;
  intervalMs?: number;
  isSettled?: (job: BackgroundJob) => boolean;
  parseResult?: (job: BackgroundJob) => T;
  onSettled?: (job: BackgroundJob, result: T) => void | Promise<void>;
  onFailed?: (job: BackgroundJob) => void;
  onError?: (error: unknown) => void;
  onCleanup?: () => void;
};

export function useBackgroundJobMonitor<T = unknown>({
  jobId,
  intervalMs = 1000,
  isSettled = defaultIsSettled,
  parseResult = ((job: BackgroundJob) => job.result as T),
  onSettled,
  onFailed,
  onError,
  onCleanup,
}: UseBackgroundJobMonitorOptions<T>) {
  useEffect(() => {
    if (!jobId) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        const job = await getBackgroundJob(jobId);
        if (!job || !isSettled(job)) {
          return;
        }
        window.clearInterval(interval);
        onCleanup?.();
        if (job.status === "failed") {
          onFailed?.(job);
          return;
        }
        await onSettled?.(job, parseResult(job));
      })().catch((error) => {
        window.clearInterval(interval);
        onCleanup?.();
        onError?.(error);
      });
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, isSettled, jobId, onCleanup, onError, onFailed, onSettled, parseResult]);
}

export function useBackgroundJobsPoll(intervalMs = 1000) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function pollJobs() {
      try {
        const nextJobs = await listBackgroundJobs();
        if (!cancelled) {
          setJobs(nextJobs);
        }
      } catch {
        if (!cancelled) {
          setJobs([]);
        }
      }
    }

    void pollJobs();
    const interval = window.setInterval(() => {
      void pollJobs();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [intervalMs]);

  async function removeJob(jobId: number) {
    await dismissBackgroundJob(jobId);
    setJobs((current) => current.filter((job) => job.id !== jobId));
  }

  return {
    jobs,
    dismissJob: removeJob,
  };
}

function defaultIsSettled(job: BackgroundJob) {
  return job.status === "succeeded" || job.status === "failed";
}
