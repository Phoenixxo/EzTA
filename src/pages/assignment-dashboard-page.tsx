import type {
  Assignment,
  ReviewStatusFilter,
  StudentRepo,
} from "../types/ezta";
import { Breadcrumbs } from "../components/navigation/breadcrumbs";
import { FileTabs } from "../components/navigation/file-tabs";
import { RepoQueuePane } from "../components/workspace/repo-queue-pane";
import { AssignmentSettingsPanel } from "../components/assignments/assignment-settings-panel";
import { RosterImportPanel } from "../components/assignments/roster-import-panel";
import { AssignmentOverviewPanel } from "../components/assignments/assignment-overview-panel";
import type { QueueSort } from "../types/ezta";

type DashboardTab = "queue" | "import" | "settings" | "overview";

type AssignmentDashboardPageProps = {
  assignment: Assignment | null;
  assignments: Assignment[];
  tab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  repos: StudentRepo[];
  filteredRepos: StudentRepo[];
  selectedRepoId: number | null;
  onSelectRepo: (repoId: number | null) => void;
  onOpenStudent: (repoId: number) => void;
  onOpenAssignments: () => void;
  onOpenSummary: () => void;
  onAddRepo: (form: {
    studentKey: string;
    studentName: string;
    repoOwner: string;
    repoName: string;
    defaultBranch: string;
  }) => Promise<unknown>;
  statusFilter: ReviewStatusFilter;
  onStatusFilterChange: (value: ReviewStatusFilter) => void;
  queueSort: QueueSort;
  onQueueSortChange: (value: QueueSort) => void;
  repoQuery: string;
  onRepoQueryChange: (value: string) => void;
  repoTemplateInput: string;
  onRepoTemplateInputChange: (value: string) => void;
  deadlineInput: string;
  onDeadlineInputChange: (value: string) => void;
  submissionKindInput: "individual" | "group";
  onSubmissionKindInputChange: (value: "individual" | "group") => void;
  onSaveAssignmentSettings: () => void;
  onDeleteAssignment: (deleteLocalWorkspace?: boolean) => Promise<void> | void;
  rosterInput: string;
  onRosterInputChange: (value: string) => void;
  onImportRoster: () => void;
  onSyncAssignment: () => void;
  busy: boolean;
};

const dashboardTabs: DashboardTab[] = [
  "queue",
  "import",
  "settings",
  "overview",
];

export function AssignmentDashboardPage({
  assignment,
  assignments,
  tab,
  onTabChange,
  repos,
  filteredRepos,
  selectedRepoId,
  onSelectRepo,
  onOpenStudent,
  onOpenAssignments,
  onOpenSummary,
  onAddRepo,
  statusFilter,
  onStatusFilterChange,
  queueSort,
  onQueueSortChange,
  repoQuery,
  onRepoQueryChange,
  repoTemplateInput,
  onRepoTemplateInputChange,
  deadlineInput,
  onDeadlineInputChange,
  submissionKindInput,
  onSubmissionKindInputChange,
  onSaveAssignmentSettings,
  onDeleteAssignment,
  rosterInput,
  onRosterInputChange,
  onImportRoster,
  onSyncAssignment,
  busy,
}: AssignmentDashboardPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <Breadcrumbs
        items={[
          { label: "Assignments", onClick: onOpenAssignments },
          { label: assignment?.name ?? "Assignment Dashboard" },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <FileTabs
          tabs={dashboardTabs}
          activeTab={tab}
          onTabChange={onTabChange}
        />

        {tab === "queue" ? (
          <RepoQueuePane
            selectedAssignmentName={assignment?.name ?? null}
            selectedAssignmentSubmissionKind={assignment?.submissionKind ?? null}
            filteredRepos={filteredRepos}
            selectedRepoId={selectedRepoId}
            onSelectRepo={(repoId) => {
              onSelectRepo(repoId);
              if (repoId !== null) {
                onOpenStudent(repoId);
              }
            }}
            onAddRepo={onAddRepo}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            queueSort={queueSort}
            onQueueSortChange={onQueueSortChange}
            repoQuery={repoQuery}
            onRepoQueryChange={onRepoQueryChange}
            busy={busy}
            className="h-full min-h-0 rounded-t-none border-t-0"
          />
        ) : null}

        {tab === "import" ? (
          <RosterImportPanel
            assignment={assignment}
            repoTemplate={repoTemplateInput}
            rosterInput={rosterInput}
            onRosterInputChange={onRosterInputChange}
            onImportRoster={onImportRoster}
            onSyncAssignment={onSyncAssignment}
            busy={busy}
            className="h-full min-h-0 rounded-t-none border-t-0"
          />
        ) : null}

        {tab === "settings" ? (
          <AssignmentSettingsPanel
            assignment={assignment}
            repoTemplateInput={repoTemplateInput}
            onRepoTemplateInputChange={onRepoTemplateInputChange}
            deadlineInput={deadlineInput}
            onDeadlineInputChange={onDeadlineInputChange}
            submissionKindInput={submissionKindInput}
            onSubmissionKindInputChange={onSubmissionKindInputChange}
            onSave={onSaveAssignmentSettings}
            onDelete={onDeleteAssignment}
            busy={busy}
            className="h-full min-h-0 rounded-t-none border-t-0"
          />
        ) : null}

        {tab === "overview" ? (
          <AssignmentOverviewPanel
            assignment={assignment}
            repos={repos}
            onOpenSummary={onOpenSummary}
            onOpenQueue={() => onTabChange("queue")}
            className="h-full min-h-0 rounded-t-none border-t-0"
          />
        ) : null}
      </div>

      <div className="rounded-none border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-600">
        Active assignments:{" "}
        <span className="font-semibold text-zinc-900">
          {assignments.length}
        </span>
      </div>
    </div>
  );
}
