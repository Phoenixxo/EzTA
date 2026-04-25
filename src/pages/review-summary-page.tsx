import type { Assignment, StudentRepo } from "../types/ezta";
import { submissionDisplayName, submissionMemberSummary } from "../lib/format";
import { Breadcrumbs } from "../components/navigation/breadcrumbs";
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
  onOpenAssignments,
  onOpenDashboard,
  onOpenStudent,
}: ReviewSummaryPageProps) {
  const unresolvedRepos = repos.filter((repo) => repo.reviewStatus !== "reviewed");

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Assignments", onClick: onOpenAssignments },
          { label: assignment?.name ?? "Assignment", onClick: onOpenDashboard },
          { label: "Review Summary" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-none border border-zinc-300 bg-white">
          <div className="border-b border-zinc-300 px-4 py-3">
            <div className="text-sm font-semibold text-zinc-900">Review queue</div>
            <div className="text-xs text-zinc-500">{repos.length} submissions in this assignment</div>
          </div>
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
            {repos.map((repo) => (
              <button
                key={repo.id}
                type="button"
                onClick={() => onOpenStudent(repo.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-zinc-200 px-4 py-3 text-left hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {submissionDisplayName(repo, assignment?.submissionKind)}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {repo.repoOwner}/{repo.repoName}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {submissionMemberSummary(repo)}
                  </div>
                </div>
                <StatusBadge status={repo.reviewStatus} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <SummaryMetric label="Needs review" value={unresolvedRepos.length} />
          <SummaryMetric label="Prepared PRs" value={repos.filter((repo) => repo.prUrl).length} />
          <SummaryMetric
            label="Missing targets"
            value={repos.filter((repo) => !repo.baseSha || !repo.submissionSha).length}
          />
          <div className="rounded-none border border-zinc-300 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Next recommended submission</div>
            <div className="mt-2 text-sm text-zinc-600">
              {unresolvedRepos[0]
                ? `${submissionDisplayName(
                    unresolvedRepos[0],
                    assignment?.submissionKind,
                  )}`
                : "All submissions are reviewed."}
            </div>
            {unresolvedRepos[0] ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => onOpenStudent(unresolvedRepos[0].id)}
              >
                Open submission
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-none border border-zinc-300 bg-white px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
