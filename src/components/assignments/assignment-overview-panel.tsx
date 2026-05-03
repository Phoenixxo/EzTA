import type { Assignment, StudentRepo } from "../../types/ezta";
import { countByStatus } from "../../lib/format";
import { Button } from "../ui/button";
import { PanelShell } from "../workspace/panel-shell";

type AssignmentOverviewPanelProps = {
  assignment: Assignment | null;
  repos: StudentRepo[];
  onOpenSummary: () => void;
  onOpenQueue: () => void;
  className?: string;
};

export function AssignmentOverviewPanel({
  assignment,
  repos,
  onOpenSummary,
  onOpenQueue,
  className,
}: AssignmentOverviewPanelProps) {
  const notStartedCount = countByStatus(repos, "not_started");
  const preparedCount = countByStatus(repos, "prepared");
  const reviewedCount = countByStatus(repos, "reviewed");
  const missingTargetCount = repos.filter(
    (repo) => !repo.baseSha || !repo.submissionSha,
  ).length;
  const preparedPrCount = repos.filter((repo) => repo.prUrl).length;

  return (
    <PanelShell
      title="Overview"
      subtitle={assignment ? assignment.name : "No assignment selected"}
      className={className}
    >
      <div className="grid gap-3 bg-stone-50 p-4 md:grid-cols-2 xl:grid-cols-5">
        <OverviewMetric label="Submissions" value={repos.length} />
        <OverviewMetric label="Not Started" value={notStartedCount} />
        <OverviewMetric label="Prepared" value={preparedCount} />
        <OverviewMetric label="Reviewed" value={reviewedCount} />
        <OverviewMetric label="Missing SHAs" value={missingTargetCount} />
      </div>
      <div className="flex flex-wrap gap-2 border-t border-stone-200 bg-white px-4 py-3">
        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
          PRs prepared:{" "}
          <span className="font-semibold text-stone-900">
            {preparedPrCount}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onOpenQueue}
        >
          Open queue tab
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenSummary}
        >
          Open review summary
        </Button>
      </div>
    </PanelShell>
  );
}

function OverviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}
