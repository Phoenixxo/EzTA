import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type {
  Assignment,
  ReviewStatusFilter,
  StudentRepo,
} from "../../types/ezta";
import { reviewStatuses } from "../../types/ezta";
import { submissionDisplayName } from "../../lib/format";
import { cn } from "../../lib/utils";
import { StatusBadge } from "./status-badge";

type QueueSidebarPaneProps = {
  assignment: Assignment | null;
  /** All repos for the assignment (unfiltered), used for progress summary. */
  repos: StudentRepo[];
  filteredRepos: StudentRepo[];
  selectedRepoId: number | null;
  onSelectRepo: (id: number | null) => void;
  statusFilter: ReviewStatusFilter;
  onStatusFilterChange: (value: ReviewStatusFilter) => void;
  repoQuery: string;
  onRepoQueryChange: (value: string) => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onOpenPrevious: () => void;
  onOpenNext: () => void;
  className?: string;
};

export function QueueSidebarPane({
  assignment,
  repos,
  filteredRepos,
  selectedRepoId,
  onSelectRepo,
  statusFilter,
  onStatusFilterChange,
  repoQuery,
  onRepoQueryChange,
  hasPrevious,
  hasNext,
  onOpenPrevious,
  onOpenNext,
  className,
}: QueueSidebarPaneProps) {
  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-stone-800">
            {assignment?.name ?? "Queue"}
          </div>
          {repos.length > 0 ? (
            <ProgressSummary repos={repos} />
          ) : (
            <div className="text-xs text-stone-500">
              {filteredRepos.length} submission
              {filteredRepos.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        {/* Prev / Next arrows */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onOpenPrevious}
            disabled={!hasPrevious}
            className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
            aria-label="Previous submission"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenNext}
            disabled={!hasNext}
            className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
            aria-label="Next submission"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-stone-200 px-2 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            value={repoQuery}
            onChange={(e) => onRepoQueryChange(e.currentTarget.value)}
            placeholder="Search submissions…"
            className="h-8 w-full rounded-md border border-stone-200 bg-stone-50 pl-8 pr-3 text-xs text-stone-900 outline-none placeholder:text-stone-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-500/20"
          />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 px-2 py-1.5">
        {reviewStatuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusFilterChange(status)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
              statusFilter === status
                ? "bg-violet-600 text-white"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200",
            )}
          >
            {status === "all" ? "All" : status.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Queue list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredRepos.length === 0 ? (
          <div className="px-3 py-6 text-sm text-stone-400">
            No submissions match.
          </div>
        ) : null}
        {filteredRepos.map((repo) => {
          const isSelected = repo.id === selectedRepoId;
          return (
            <button
              key={repo.id}
              type="button"
              onClick={() => onSelectRepo(repo.id)}
              className={cn(
                "flex w-full items-start gap-2 border-b border-stone-100 border-l-2 px-3 py-2.5 text-left transition-colors",
                isSelected
                  ? "border-l-violet-500 bg-violet-50"
                  : "border-l-transparent hover:bg-stone-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-stone-900">
                  {submissionDisplayName(repo, null) || "Unknown"}
                </div>
                <div className="truncate text-xs text-stone-400">
                  {repo.repoOwner}/{repo.repoName}
                </div>
              </div>
              <div className="shrink-0 pt-0.5">
                <StatusBadge status={repo.reviewStatus} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Progress summary ─────────────────────────────────────────────────────────

function ProgressSummary({ repos }: { repos: StudentRepo[] }) {
  const total = repos.length;
  const reviewed = repos.filter((r) => r.reviewStatus === "reviewed").length;
  const prepared = repos.filter((r) => r.reviewStatus === "prepared").length;
  const notStarted = total - reviewed - prepared;

  return (
    <div className="mt-0.5 flex items-center gap-2 text-xs">
      <span className="text-emerald-700 font-medium">
        {reviewed}/{total} reviewed
      </span>
      {prepared > 0 ? (
        <span className="text-sky-600">{prepared} prepared</span>
      ) : null}
      {notStarted > 0 ? (
        <span className="text-stone-400">{notStarted} left</span>
      ) : null}
    </div>
  );
}
