import { FormEvent, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import type {
  QueueSort,
  RepoForm,
  ReviewStatusFilter,
  StudentRepo,
  SubmissionKind,
} from "../../types/ezta";
import { emptyRepoForm, queueSorts, reviewStatuses } from "../../types/ezta";
import {
  shortSha,
  submissionDisplayName,
  submissionKindLabel,
  submissionMemberSummary,
} from "../../lib/format";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PanelShell } from "./panel-shell";
import { StatusBadge } from "./status-badge";

type RepoQueuePaneProps = {
  selectedAssignmentName: string | null;
  selectedAssignmentSubmissionKind: SubmissionKind | null;
  filteredRepos: StudentRepo[];
  selectedRepoId: number | null;
  onSelectRepo: (id: number | null) => void;
  onAddRepo: (form: RepoForm) => Promise<unknown>;
  statusFilter: ReviewStatusFilter;
  onStatusFilterChange: (value: ReviewStatusFilter) => void;
  queueSort: QueueSort;
  onQueueSortChange: (value: QueueSort) => void;
  repoQuery: string;
  onRepoQueryChange: (value: string) => void;
  busy: boolean;
  className?: string;
};

export function RepoQueuePane({
  selectedAssignmentName,
  selectedAssignmentSubmissionKind,
  filteredRepos,
  selectedRepoId,
  onSelectRepo,
  onAddRepo,
  statusFilter,
  onStatusFilterChange,
  queueSort,
  onQueueSortChange,
  repoQuery,
  onRepoQueryChange,
  busy,
  className,
}: RepoQueuePaneProps) {
  const [form, setForm] = useState<RepoForm>(emptyRepoForm);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAddRepo(form);
    setForm((current) => ({ ...emptyRepoForm, repoOwner: current.repoOwner }));
    setShowAddForm(false);
  }

  return (
    <PanelShell
      title="Queue"
      subtitle={selectedAssignmentName ?? "Select an assignment"}
      className={cn("min-h-0", className)}
      bodyClassName="grid min-h-0 grid-rows-[auto_auto_1fr]"
    >
      {/* Toolbar: search + filters + add button */}
      <div className="border-b border-stone-200 bg-stone-50 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <Input
              value={repoQuery}
              onChange={(event) => onRepoQueryChange(event.currentTarget.value)}
              placeholder="Filter by name, repo, or SHA"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <select
            value={queueSort}
            onChange={(event) =>
              onQueueSortChange(event.currentTarget.value as QueueSort)
            }
            className="h-8 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-800 outline-none focus:border-violet-400"
          >
            {queueSorts.map((sort) => (
              <option key={sort} value={sort}>
                {sort}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant={showAddForm ? "outline" : "ghost"}
            onClick={() => setShowAddForm((v) => !v)}
            className="h-8 shrink-0"
          >
            {showAddForm ? (
              <>
                <X className="h-3.5 w-3.5" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Add
              </>
            )}
          </Button>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1">
          {reviewStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
                statusFilter === status
                  ? "bg-violet-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200",
              )}
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible add-repo form */}
      {showAddForm ? (
        <div className="border-b border-stone-200 bg-white px-3 py-3">
          <form
            className="grid gap-2 xl:grid-cols-[0.8fr_1fr_1fr_1fr_0.8fr_auto]"
            onSubmit={handleSubmit}
          >
            <Input
              value={form.studentKey}
              onChange={(e) =>
                setForm((c) => ({ ...c, studentKey: e.currentTarget.value }))
              }
              placeholder="Student key"
              className="h-8 text-sm"
              required
            />
            <Input
              value={form.studentName}
              onChange={(e) =>
                setForm((c) => ({ ...c, studentName: e.currentTarget.value }))
              }
              placeholder="Student name"
              className="h-8 text-sm"
            />
            <Input
              value={form.repoOwner}
              onChange={(e) =>
                setForm((c) => ({ ...c, repoOwner: e.currentTarget.value }))
              }
              placeholder="Repo owner"
              className="h-8 text-sm"
              required
            />
            <Input
              value={form.repoName}
              onChange={(e) =>
                setForm((c) => ({ ...c, repoName: e.currentTarget.value }))
              }
              placeholder="Repo name"
              className="h-8 text-sm"
              required
            />
            <Input
              value={form.defaultBranch}
              onChange={(e) =>
                setForm((c) => ({ ...c, defaultBranch: e.currentTarget.value }))
              }
              placeholder="Branch"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="default" disabled={busy}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </form>
        </div>
      ) : null}

      {/* Queue list */}
      <div className="flex min-h-0 flex-col overflow-hidden bg-white">
        <div className="grid grid-cols-[1fr_1.1fr_0.75fr_0.7fr_0.7fr_0.55fr] gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          <span>Submission</span>
          <span>Repository</span>
          <span>Status</span>
          <span>Base</span>
          <span>Submission</span>
          <span>PR</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div className="px-4 py-8 text-sm text-stone-500">
              No submissions match the current filter.
            </div>
          ) : null}
          {filteredRepos.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => onSelectRepo(repo.id)}
              className={cn(
                "grid w-full grid-cols-[1fr_1.1fr_0.75fr_0.7fr_0.7fr_0.55fr] gap-3 border-b border-stone-100 px-3 py-3 text-left text-sm transition-colors hover:bg-stone-50",
                repo.id === selectedRepoId
                  ? "border-l-2 border-l-violet-500 bg-violet-50 text-stone-900 hover:bg-violet-50"
                  : "border-l-2 border-l-transparent",
              )}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {submissionDisplayName(
                    repo,
                    selectedAssignmentSubmissionKind,
                  ) || "Unknown"}
                </div>
                <div className="truncate text-xs opacity-65">
                  {submissionKindLabel(repo, selectedAssignmentSubmissionKind)}
                </div>
                <div className="truncate text-xs opacity-65">
                  {submissionMemberSummary(repo)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate">
                  {repo.repoOwner}/{repo.repoName}
                </div>
                <div className="truncate text-xs opacity-65">
                  {repo.defaultBranch}
                </div>
              </div>
              <div className="pt-0.5">
                <StatusBadge status={repo.reviewStatus} />
              </div>
              <div className="font-mono text-xs">{shortSha(repo.baseSha)}</div>
              <div className="font-mono text-xs">
                {shortSha(repo.submissionSha)}
              </div>
              <div className="text-xs">{repo.prUrl ? "open" : "—"}</div>
            </button>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
