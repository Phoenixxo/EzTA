import { CheckCircle2, FolderGit2, LoaderCircle, Settings, XCircle } from "lucide-react";
import type { Assignment, BackgroundJob } from "../../types/ezta";
import { cn } from "../../lib/utils";

type AppSidebarProps = {
  assignments: Assignment[];
  currentAssignmentId: number | null;
  isOnAssignmentsHome: boolean;
  jobs: BackgroundJob[];
  onDismissJob: (id: number) => void;
  onOpenAssignment: (id: number) => void;
  onOpenAssignmentsHome: () => void;
  onOpenSettings: () => void;
};

export function AppSidebar({
  assignments,
  currentAssignmentId,
  isOnAssignmentsHome,
  jobs,
  onDismissJob,
  onOpenAssignment,
  onOpenAssignmentsHome,
  onOpenSettings,
}: AppSidebarProps) {
  const activeJobs = jobs.filter(
    (j) => j.status === "queued" || j.status === "running",
  );
  const finishedJobs = jobs.filter(
    (j) => j.status === "succeeded" || j.status === "failed",
  );

  return (
    <div className="flex w-[200px] shrink-0 flex-col overflow-hidden border-r border-stone-800 bg-stone-950 text-stone-300">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-stone-800 px-4 py-3.5">
        <FolderGit2 className="h-4 w-4 shrink-0 text-violet-400" />
        <span className="text-sm font-semibold tracking-tight text-white">
          EzTA
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 min-h-0 flex-col overflow-hidden py-1">
        {/* Home */}
        <button
          type="button"
          onClick={onOpenAssignmentsHome}
          className={cn(
            "flex w-full items-center px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
            isOnAssignmentsHome
              ? "text-white"
              : "text-stone-500 hover:text-stone-200",
          )}
        >
          Assignments
        </button>

        {/* Divider */}
        {assignments.length > 0 ? (
          <div className="mx-4 my-1 border-t border-stone-800" />
        ) : null}

        {/* Assignment list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {assignments.map((assignment) => {
            const isActive = assignment.id === currentAssignmentId;
            return (
              <button
                key={assignment.id}
                type="button"
                onClick={() => onOpenAssignment(assignment.id)}
                className={cn(
                  "flex w-full items-start gap-0 border-l-2 px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "border-l-violet-500 bg-stone-800 text-white"
                    : "border-l-transparent text-stone-400 hover:bg-stone-900 hover:text-stone-200",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium leading-snug">
                    {assignment.name}
                  </div>
                  <div className="truncate text-[11px] text-stone-500">
                    {assignment.submissionKind === "group"
                      ? "Group"
                      : "Individual"}
                  </div>
                </div>
              </button>
            );
          })}

          {assignments.length === 0 ? (
            <div className="px-4 py-3 text-[11px] text-stone-600">
              No assignments yet
            </div>
          ) : null}
        </div>
      </nav>

      {/* Bottom: jobs + settings */}
      <div className="border-t border-stone-800">
        {/* Active jobs indicator */}
        {activeJobs.length > 0 ? (
          <div className="border-b border-stone-800 px-3 py-2">
            {activeJobs.slice(0, 2).map((job) => (
              <div key={job.id} className="flex items-center gap-2 py-0.5">
                <LoaderCircle className="h-3 w-3 animate-spin shrink-0 text-violet-400" />
                <span className="truncate text-[11px] text-stone-400">
                  {job.label}
                </span>
              </div>
            ))}
            {activeJobs.length > 2 ? (
              <div className="text-[11px] text-stone-600">
                +{activeJobs.length - 2} more
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Recently finished jobs */}
        {finishedJobs.length > 0 ? (
          <div className="border-b border-stone-800 px-3 py-2">
            {finishedJobs.slice(0, 2).map((job) => (
              <div key={job.id} className="flex items-center gap-2 py-0.5">
                {job.status === "succeeded" ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                )}
                <span className="flex-1 truncate text-[11px] text-stone-400">
                  {job.label}
                </span>
                <button
                  type="button"
                  onClick={() => onDismissJob(job.id)}
                  className="shrink-0 text-[11px] text-stone-600 hover:text-stone-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-stone-400 transition-colors hover:bg-stone-900 hover:text-stone-200"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </button>
      </div>
    </div>
  );
}
