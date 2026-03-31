import { useEffect, useMemo, useState } from "react";
import { FolderGit2, Settings } from "lucide-react";
import { nextRepoId, previousRepoId } from "../lib/format";
import { useBackgroundJobsPoll } from "../hooks/use-background-jobs";
import { useEztaWorkspace } from "../hooks/use-ezta-workspace";
import { AssignmentsPage } from "./assignments-page";
import { AssignmentDashboardPage } from "./assignment-dashboard-page";
import { StudentReviewPage } from "./student-review-page";
import { ReviewSummaryPage } from "./review-summary-page";
import { ReviewWorkspace } from "../features/review/components/review-workspace";
import { openSettingsWindow } from "../lib/settings-window";
import { JobTray } from "../components/workspace/job-tray";

type Route =
  | { page: "assignments" }
  | {
      page: "assignment";
      assignmentId: number;
      tab: "queue" | "import" | "settings" | "overview";
    }
  | { page: "student"; assignmentId: number; studentRepoId: number }
  | { page: "review"; assignmentId: number; studentRepoId: number }
  | { page: "summary"; assignmentId: number };

export function WorkspacePage() {
  const workspace = useEztaWorkspace();
  const routeStorageKey = "ezta.route";
  const [route, setRoute] = useState<Route>({ page: "assignments" });
  const { jobs, dismissJob } = useBackgroundJobsPoll();

  const selectedPosition = workspace.filteredRepos.findIndex(
    (repo) => repo.id === workspace.selectedRepoId,
  );

  const hasPrevious = workspace.filteredRepos.length > 1;
  const hasNext = workspace.filteredRepos.length > 1;

  const currentAssignmentId =
    route.page === "assignment" ||
    route.page === "student" ||
    route.page === "review" ||
    route.page === "summary"
      ? route.assignmentId
      : null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(routeStorageKey);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Route;
      setRoute(parsed);
    } catch {
      window.localStorage.removeItem(routeStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(routeStorageKey, JSON.stringify(route));
  }, [route]);

  useEffect(() => {
    if (currentAssignmentId && workspace.selectedAssignmentId !== currentAssignmentId) {
      workspace.setSelectedAssignmentId(currentAssignmentId);
    }
  }, [currentAssignmentId, workspace]);

  useEffect(() => {
    const currentRepoId =
      route.page === "student" || route.page === "review" ? route.studentRepoId : null;
    if (currentRepoId && workspace.selectedRepoId !== currentRepoId) {
      workspace.setSelectedRepoId(currentRepoId);
    }
  }, [route, workspace]);

  useEffect(() => {
    if (
      currentAssignmentId &&
      workspace.assignments.length > 0 &&
      !workspace.assignments.some((assignment) => assignment.id === currentAssignmentId)
    ) {
      setRoute({ page: "assignments" });
    }
  }, [currentAssignmentId, workspace.assignments]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }
      if (!event.altKey) {
        return;
      }

      if (route.page !== "student" && route.page !== "review") {
        return;
      }

      const lowerKey = event.key.toLowerCase();

      if (lowerKey === "j") {
        event.preventDefault();
        const repoId = nextRepoId(workspace.filteredRepos, workspace.selectedRepoId);
        if (repoId !== null) {
          workspace.setSelectedRepoId(repoId);
          setRoute({
            page: "student",
            assignmentId:
              route.page === "review" || route.page === "student"
                ? route.assignmentId
                : currentAssignmentId ?? workspace.selectedAssignmentId ?? 0,
            studentRepoId: repoId,
          });
        }
        return;
      }

      if (lowerKey === "k") {
        event.preventDefault();
        const repoId = previousRepoId(workspace.filteredRepos, workspace.selectedRepoId);
        if (repoId !== null) {
          workspace.setSelectedRepoId(repoId);
          setRoute({
            page: "student",
            assignmentId:
              route.page === "review" || route.page === "student"
                ? route.assignmentId
                : currentAssignmentId ?? workspace.selectedAssignmentId ?? 0,
            studentRepoId: repoId,
          });
        }
        return;
      }

      if (lowerKey === "s") {
        event.preventDefault();
        void workspace.handleSaveTarget();
        return;
      }

      if (lowerKey === "p") {
        event.preventDefault();
        void workspace.handlePrepareReview();
        return;
      }

      if (lowerKey === "o") {
        event.preventDefault();
        workspace.handleOpenPr();
        return;
      }

      if (lowerKey === "r") {
        event.preventDefault();
        void workspace.handleMarkReviewed();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentAssignmentId, route, workspace]);

  const pageContent = useMemo(() => {
    switch (route.page) {
      case "assignments":
        return (
          <AssignmentsPage
            assignments={workspace.assignments}
            selectedAssignmentId={workspace.selectedAssignmentId}
            onSelectAssignment={workspace.setSelectedAssignmentId}
            onOpenAssignment={(assignmentId) => {
              workspace.setSelectedAssignmentId(assignmentId);
              setRoute({ page: "assignment", assignmentId, tab: "queue" });
            }}
            onCreateAssignment={workspace.handleCreateAssignment}
            onDeleteAssignment={async (assignmentId, deleteLocalWorkspace) => {
              await workspace.handleDeleteAssignment(
                deleteLocalWorkspace,
                assignmentId,
              );
              setRoute({ page: "assignments" });
            }}
            busy={workspace.busy}
          />
        );
      case "assignment":
        return (
          <AssignmentDashboardPage
            assignment={workspace.selectedAssignment}
            assignments={workspace.assignments}
            tab={route.tab}
            onTabChange={(tab) => setRoute({ ...route, tab })}
            repos={workspace.repos}
            filteredRepos={workspace.filteredRepos}
            selectedRepoId={workspace.selectedRepoId}
            onSelectRepo={workspace.setSelectedRepoId}
            onOpenStudent={(repoId) =>
              setRoute({
                page: "student",
                assignmentId: route.assignmentId,
                studentRepoId: repoId,
              })
            }
            onOpenAssignments={() => setRoute({ page: "assignments" })}
            onOpenSummary={() =>
              setRoute({ page: "summary", assignmentId: route.assignmentId })
            }
            onAddRepo={workspace.handleAddRepo}
            statusFilter={workspace.statusFilter}
            onStatusFilterChange={workspace.setStatusFilter}
            queueSort={workspace.queueSort}
            onQueueSortChange={workspace.setQueueSort}
            repoQuery={workspace.repoQuery}
            onRepoQueryChange={workspace.setRepoQuery}
            repoTemplateInput={workspace.repoTemplateInput}
            onRepoTemplateInputChange={workspace.setRepoTemplateInput}
            deadlineInput={workspace.deadlineInput}
            onDeadlineInputChange={workspace.setDeadlineInput}
            onSaveAssignmentSettings={workspace.handleUpdateAssignmentDeadline}
            onDeleteAssignment={async (deleteLocalWorkspace) => {
              await workspace.handleDeleteAssignment(deleteLocalWorkspace);
              setRoute({ page: "assignments" });
            }}
            rosterInput={workspace.rosterInput}
            onRosterInputChange={workspace.setRosterInput}
            onImportRoster={workspace.handleImportRoster}
            onSyncAssignment={workspace.handleSyncAssignment}
            busy={workspace.busy}
          />
        );
      case "student":
        return (
          <StudentReviewPage
            assignmentName={workspace.selectedAssignment?.name ?? null}
            selectedRepo={workspace.selectedRepo}
            filteredRepoCount={workspace.filteredRepos.length}
            selectedPosition={selectedPosition >= 0 ? selectedPosition + 1 : 0}
            commitOptions={workspace.commitOptions}
            pickerTarget={workspace.pickerTarget}
            onPickerTargetChange={workspace.setPickerTarget}
            baseInput={workspace.baseInput}
            onBaseInputChange={workspace.setBaseInput}
            submissionInput={workspace.submissionInput}
            onSubmissionInputChange={workspace.setSubmissionInput}
            notesInput={workspace.notesInput}
            onNotesInputChange={workspace.setNotesInput}
            statusInput={workspace.statusInput}
            onStatusInputChange={workspace.setStatusInput}
            onLoadCommitOptions={workspace.handleLoadCommitOptions}
            onValidateTarget={workspace.handleValidateTarget}
            onSaveTarget={workspace.handleSaveTarget}
            onSaveRepoMeta={workspace.handleSaveRepoMeta}
            onPrepareReview={workspace.handlePrepareReview}
            onOpenRepoInEditor={workspace.handleOpenRepoInEditor}
            onOpenReviewWorkspace={() =>
              setRoute({
                page: "review",
                assignmentId: route.assignmentId,
                studentRepoId: route.studentRepoId,
              })
            }
            onApplyPickedRevision={workspace.applyPickedRevision}
            onOpenAssignments={() => setRoute({ page: "assignments" })}
            onOpenDashboard={() =>
              setRoute({
                page: "assignment",
                assignmentId: route.assignmentId,
                tab: "queue",
              })
            }
            onOpenPrevious={() => {
              const repoId = previousRepoId(
                workspace.filteredRepos,
                workspace.selectedRepoId,
              );
              if (repoId !== null) {
                workspace.setSelectedRepoId(repoId);
                setRoute({
                  page: "student",
                  assignmentId: route.assignmentId,
                  studentRepoId: repoId,
                });
              }
            }}
            onOpenNext={() => {
              const repoId = nextRepoId(
                workspace.filteredRepos,
                workspace.selectedRepoId,
              );
              if (repoId !== null) {
                workspace.setSelectedRepoId(repoId);
                setRoute({
                  page: "student",
                  assignmentId: route.assignmentId,
                  studentRepoId: repoId,
                });
              }
            }}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            selectedAssignmentDeadline={workspace.selectedAssignment?.deadlineAt ?? null}
            busy={workspace.busy}
          />
        );
      case "review":
        return (
          <ReviewWorkspace
            selectedRepo={workspace.selectedRepo}
            editorCommand={workspace.resolvedEditorCommand}
            onBack={() =>
              setRoute({
                page: "student",
                assignmentId: route.assignmentId,
                studentRepoId: route.studentRepoId,
              })
            }
          />
        );
      case "summary":
        return (
          <ReviewSummaryPage
            assignment={workspace.selectedAssignment}
            repos={workspace.repos}
            onOpenAssignments={() => setRoute({ page: "assignments" })}
            onOpenDashboard={() =>
              setRoute({
                page: "assignment",
                assignmentId: route.assignmentId,
                tab: "overview",
              })
            }
            onOpenStudent={(repoId) =>
              setRoute({
                page: "student",
                assignmentId: route.assignmentId,
                studentRepoId: repoId,
              })
            }
          />
        );
    }
  }, [route, workspace, selectedPosition, hasPrevious, hasNext]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#d7d6d1] p-4 text-zinc-950">
      <div className="mb-3 flex items-center rounded-none border border-zinc-400 bg-linear-to-b from-zinc-100 to-zinc-200 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div className="flex items-center gap-3">
          <div className="rounded-none border border-zinc-400 bg-white p-1.5">
            <FolderGit2 className="h-4 w-4 text-zinc-700" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.12em] uppercase text-zinc-700">
              EzTA Workbench
            </div>
            <div className="text-xs text-zinc-500">
              {workspace.selectedAssignment?.name ?? "Assignment navigation"}
            </div>
          </div>
        </div>
      </div>

      {workspace.error ? (
        <div className="mb-3 rounded-none border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {workspace.error}
        </div>
      ) : null}

      {pageContent}

      <button
        type="button"
        onClick={() => {
          void openSettingsWindow().catch((err) => {
            window.alert(`Unable to open settings window.\n\n${String(err)}`);
          });
        }}
        className="fixed right-4 bottom-4 rounded-none border border-zinc-400 bg-white p-3 text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-zinc-50"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4" />
      </button>
      <JobTray
        jobs={jobs}
        onDismiss={(jobId) => {
          void dismissJob(jobId);
        }}
      />
    </div>
  );
}
