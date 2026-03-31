import { CheckCircle2, LoaderCircle, X, XCircle } from "lucide-react";
import type { BackgroundJob } from "../../types/ezta";
import { Button } from "../ui/button";

type JobTrayProps = {
  jobs: BackgroundJob[];
  onDismiss: (jobId: number) => void;
};

export function JobTray({ jobs, onDismiss }: JobTrayProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[360px] max-w-[calc(100vw-6rem)] border border-zinc-300 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="border-b border-zinc-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
        Background Jobs
      </div>
      <div className="max-h-80 overflow-y-auto">
        {jobs.map((job) => (
          <div key={job.id} className="border-b border-zinc-200 px-3 py-3 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                  {job.status === "queued" || job.status === "running" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-zinc-500" />
                  ) : job.status === "succeeded" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="truncate">{job.label}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{job.message}</div>
                {job.error ? <div className="mt-1 text-xs text-red-700">{job.error}</div> : null}
              </div>
              {job.status === "succeeded" || job.status === "failed" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(job.id)}
                  className="h-7 px-2"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
