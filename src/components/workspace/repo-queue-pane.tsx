import { FormEvent, useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import type { QueueSort, RepoForm, ReviewStatusFilter, StudentRepo } from "../../types/ezta";
import { emptyRepoForm, queueSorts, reviewStatuses } from "../../types/ezta";
import {
  isGroupSubmission,
  nextRepoId,
  shortSha,
  submissionDisplayName,
  submissionMemberSummary,
} from "../../lib/format";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PanelShell } from "./panel-shell";
import { StatusBadge } from "./status-badge";

type RepoQueuePaneProps = {
  selectedAssignmentName: string | null;
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAddRepo(form);
    setForm((current) => ({ ...emptyRepoForm, repoOwner: current.repoOwner }));
  }

  return (
    <PanelShell
      title="Queue"
      subtitle={selectedAssignmentName ?? "Select an assignment"}
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSelectRepo(nextRepoId(filteredRepos, selectedRepoId))}
          disabled={filteredRepos.length === 0}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      }
      className={cn("min-h-0", className)}
      bodyClassName="grid min-h-0 grid-rows-[auto_auto_1fr]"
    >
      <div className="border-b border-zinc-300 bg-white px-3 py-3">
        <form className="grid gap-2 xl:grid-cols-[0.8fr_1fr_1fr_1fr_0.8fr_auto]" onSubmit={handleSubmit}>
          <Input
            value={form.studentKey}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, studentKey: value }));
            }}
            placeholder="Student key"
            className="h-9 rounded-none"
            required
          />
          <Input
            value={form.studentName}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, studentName: value }));
            }}
            placeholder="Student name"
            className="h-9 rounded-none"
          />
          <Input
            value={form.repoOwner}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, repoOwner: value }));
            }}
            placeholder="Repo owner"
            className="h-9 rounded-none"
            required
          />
          <Input
            value={form.repoName}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, repoName: value }));
            }}
            placeholder="Repo name"
            className="h-9 rounded-none"
            required
          />
          <Input
            value={form.defaultBranch}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, defaultBranch: value }));
            }}
            placeholder="Branch"
            className="h-9 rounded-none"
          />
          <Button type="submit" size="sm" variant="outline" disabled={busy}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </form>
      </div>

      <div className="border-b border-zinc-300 bg-[#f0f0ed] px-3 py-2">
        <div className="grid gap-2 xl:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={repoQuery}
              onChange={(event) => onRepoQueryChange(event.currentTarget.value)}
              placeholder="Filter by team, member, repo, or SHA"
              className="h-9 rounded-none pl-9"
            />
          </div>
          <select
            value={queueSort}
            onChange={(event) => onQueueSortChange(event.currentTarget.value as QueueSort)}
            className="h-9 rounded-none border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          >
            {queueSorts.map((sort) => (
              <option key={sort} value={sort}>
                sort: {sort}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {reviewStatuses.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? "default" : "outline"}
                onClick={() => onStatusFilterChange(status)}
              >
                {status === "all" ? "all" : status.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden bg-white">
        <div className="grid grid-cols-[1fr_1.1fr_0.75fr_0.7fr_0.7fr_0.55fr] gap-3 border-b border-zinc-300 bg-zinc-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <span>Submission</span>
          <span>Repository</span>
          <span>Status</span>
          <span>Base</span>
          <span>Submission</span>
          <span>PR</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div className="px-4 py-8 text-sm text-zinc-500">No repositories match the current filter.</div>
          ) : null}
          {filteredRepos.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => onSelectRepo(repo.id)}
              className={cn(
                "grid w-full grid-cols-[1fr_1.1fr_0.75fr_0.7fr_0.7fr_0.55fr] gap-3 border-b border-zinc-200 px-3 py-3 text-left text-sm hover:bg-zinc-50",
                repo.id === selectedRepoId && "bg-stone-900 text-white hover:bg-stone-900",
              )}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {submissionDisplayName(repo) || "Unknown"}
                </div>
                <div className="truncate text-xs opacity-65">
                  {isGroupSubmission(repo) ? "Team submission" : "Individual submission"}
                </div>
                <div className="truncate text-xs opacity-65">
                  {submissionMemberSummary(repo)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate">{repo.repoOwner}/{repo.repoName}</div>
                <div className="truncate text-xs opacity-65">{repo.defaultBranch}</div>
              </div>
              <div className="pt-0.5">
                <StatusBadge status={repo.reviewStatus} />
              </div>
              <div className="font-mono text-xs">{shortSha(repo.baseSha)}</div>
              <div className="font-mono text-xs">{shortSha(repo.submissionSha)}</div>
              <div className="text-xs">{repo.prUrl ? "open" : "pending"}</div>
            </button>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
