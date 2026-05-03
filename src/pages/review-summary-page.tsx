import type { Assignment, StudentRepo } from "../types/ezta";
import { submissionDisplayName, submissionMemberSummary } from "../lib/format";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/workspace/status-badge";

type ReviewSummaryPageProps = {
  assignment: Assignment | null;
  repos: StudentRepo[];
  onOpenAssignments: () => void;
  onOpenDashboard: () => void;
  onOpenStudent: (repoId: number) => void;
};

export function ReviewSummaryPage({
  assignment,
  repos,
  onOpenDashboard,
  onOpenStudent,
}: ReviewSummaryPageProps) {
  const unresolvedRepos = repos.filter(
    (repo) => repo.reviewStatus !== "reviewed",
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <div className="text-sm font-semibold text-stone-900">
              {assignment?.name ?? "Review Summary"}
            </div>
            <div className="text-xs text-stone-500">
              {repos.length} submissions in this assignment
            </div>
          </div>
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
            {repos.map((repo) => (
              <button
                key={repo.id}
                type="button"
                onClick={() => onOpenStudent(repo.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-stone-100 px-4 py-3 text-left transition-colors hover:bg-stone-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-stone-900">
                    {submissionDisplayName(repo, assignment?.submissionKind)}
                  </div>
                  <div className="truncate text-xs text-stone-400">
                    {repo.repoOwner}/{repo.repoName}
                  </div>
                  {submissionMemberSummary(repo) ? (
                    <div className="truncate text-xs text-stone-400">
                      {submissionMemberSummary(repo)}
                    </div>
                  ) : null}
                </div>
                <StatusBadge status={repo.reviewStatus} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <SummaryMetric label="Needs review" value={unresolvedRepos.length} />
          <SummaryMetric
            label="Prepared PRs"
            value={repos.filter((repo) => repo.prUrl).length}
          />
          <SummaryMetric
            label="Missing targets"
            value={
              repos.filter((repo) => !repo.baseSha || !repo.submissionSha)
                .length
            }
          />
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="text-sm font-semibold text-stone-900">Next up</div>
            <div className="mt-2 text-sm text-stone-600">
              {unresolvedRepos[0]
                ? submissionDisplayName(
                    unresolvedRepos[0],
                    assignment?.submissionKind,
                  )
                : "All submissions are reviewed."}
            </div>
            {unresolvedRepos[0] ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                className="mt-3"
                onClick={() => onOpenStudent(unresolvedRepos[0].id)}
              >
                Open submission
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenDashboard}
            className="w-full"
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold text-stone-900">
        {value}
      </div>
    </div>
  );
}
