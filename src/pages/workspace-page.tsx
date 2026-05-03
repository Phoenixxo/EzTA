import { useEffect, useMemo, useState } from "react";
import { nextRepoId, previousRepoId } from "../lib/format";
import { useBackgroundJobsPoll } from "../hooks/use-background-jobs";
import { useEztaWorkspace } from "../hooks/use-ezta-workspace";
import { AssignmentsPage } from "./assignments-page";
import { AssignmentDashboardPage } from "./assignment-dashboard-page";
import { ReviewSummaryPage } from "./review-summary-page";
import { ReviewWorkspace } from "../features/review/components/review-workspace";
import { InspectorPane } from "../components/workspace/inspector-pane";
import { QueueSidebarPane } from "../components/workspace/queue-sidebar-pane";
import { AppSidebar } from "../components/navigation/app-sidebar";
import { readStoredRoute, writeStoredRoute } from "../lib/ezta-storage";
import { openSettingsWindow } from "../lib/settings-window";

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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRoute(value: unknown): value is Route {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  switch (candidate.page) {
    case "assignments":
      return true;
    case "assignment":
      return (
        isPositiveInteger(candidate.assignmentId) &&
        (candidate.tab === "queue" ||
          candidate.tab === "import" ||
          candidate.tab === "settings" ||
          candidate.tab === "overview")
      );
    case "student":
    case "review":
      return (
        isPositiveInteger(candidate.assignmentId) &&
        isPositiveInteger(candidate.studentRepoId)
      );
    case "summary":
      return isPositiveInteger(candidate.assignmentId);
    default:
      return false;
  }
}

export function WorkspacePage() {
  const workspace = useEztaWorkspace();
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
    const parsed = readStoredRoute<Route>(isRoute);
    if (parsed) {
      setRoute(parsed);
    }
  }, []);

  useEffect(() => {
    writeStoredRoute(route);
  }, [route]);

  useEffect(() => {
    if (
      currentAssignmentId &&
      workspace.selectedAssignmentId !== currentAssignmentId
    ) {
      workspace.setSelectedAssignmentId(currentAssignmentId);
    }
  }, [currentAssignmentId, workspace]);

  useEffect(() => {
    const currentRepoId =
      route.page === "student" || route.page === "review"
        ? route.studentRepoId
        : null;
    if (currentRepoId && workspace.selectedRepoId !== currentRepoId) {
      workspace.setSelectedRepoId(currentRepoId);
    }
  }, [route, workspace]);

  useEffect(() => {
    if (
      currentAssignmentId &&
      workspace.assignments.length > 0 &&
      !workspace.assignments.some(
        (assignment) => assignment.id === currentAssignmentId,
      )
    ) {
      setRoute({ page: "assignments" });
    }
  }, [currentAssignmentId, workspace.assignments]);

  useEffect(() => {
    if (route.page !== "student" && route.page !== "review") {
      return;
    }
    if (workspace.selectedAssignmentId !== route.assignmentId) {
      return;
    }
    if (workspace.busy) {
      return;
    }

    const matchingRepo = workspace.repos.find(
      (repo) => repo.id === route.studentRepoId,
    );
    if (matchingRepo) {
      return;
    }

    if (
      workspace.selectedRepoId &&
      workspace.repos.some((repo) => repo.id === workspace.selectedRepoId)
    ) {
      setRoute({
        page: route.page,
        assignmentId: route.assignmentId,
        studentRepoId: workspace.selectedRepoId,
      });
      return;
    }

    setRoute({
      page: "assignment",
      assignmentId: route.assignmentId,
      tab: "queue",
    });
  }, [
    route,
    workspace.busy,
    workspace.repos,
    workspace.selectedAssignmentId,
    workspace.selectedRepoId,
  ]);

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
        const repoId = nextRepoId(
          workspace.filteredRepos,
          workspace.selectedRepoId,
        );
        if (repoId !== null) {
          workspace.setSelectedRepoId(repoId);
          setRoute({
            page: "student",
            assignmentId:
              route.page === "review" || route.page === "student"
                ? route.assignmentId
                : (currentAssignmentId ?? workspace.selectedAssignmentId ?? 0),
            studentRepoId: repoId,
          });
        }
        return;
      }

      if (lowerKey === "k") {
        event.preventDefault();
        const repoId = previousRepoId(
          workspace.filteredRepos,
          workspace.selectedRepoId,
        );
        if (repoId !== null) {
          workspace.setSelectedRepoId(repoId);
          setRoute({
            page: "student",
            assignmentId:
              route.page === "review" || route.page === "student"
                ? route.assignmentId
                : (currentAssignmentId ?? workspace.selectedAssignmentId ?? 0),
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
            submissionKindInput={workspace.submissionKindInput}
            onSubmissionKindInputChange={workspace.setSubmissionKindInput}
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
          // Persistent split: queue sidebar on the left, inspector on the right
          <div className="flex h-full min-h-0 gap-3 overflow-hidden">
            <QueueSidebarPane
              assignment={workspace.selectedAssignment}
              repos={workspace.repos}
              filteredRepos={workspace.filteredRepos}
              selectedRepoId={workspace.selectedRepoId}
              onSelectRepo={(repoId: number | null) => {
                workspace.setSelectedRepoId(repoId);
                if (repoId !== null) {
                  setRoute({
                    page: "student",
                    assignmentId: route.assignmentId,
                    studentRepoId: repoId,
                  });
                }
              }}
              statusFilter={workspace.statusFilter}
              onStatusFilterChange={workspace.setStatusFilter}
              repoQuery={workspace.repoQuery}
              onRepoQueryChange={workspace.setRepoQuery}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
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
            />
            <div className="flex min-w-0 flex-1 overflow-hidden">
              <InspectorPane
                selectedRepo={workspace.selectedRepo}
                selectedAssignmentSubmissionKind={
                  workspace.selectedAssignment?.submissionKind ?? null
                }
                selectedAssignmentDeadline={
                  workspace.selectedAssignment?.deadlineAt ?? null
                }
                filteredRepoCount={workspace.filteredRepos.length}
                selectedPosition={
                  selectedPosition >= 0 ? selectedPosition + 1 : 0
                }
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
                onMarkReviewed={() => void workspace.handleMarkReviewed()}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
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
                busy={workspace.busy}
              />
            </div>
          </div>
        );
      case "review":
        return (
          <ReviewWorkspace
            selectedRepo={workspace.selectedRepo}
            assignmentSubmissionKind={
              workspace.selectedAssignment?.submissionKind ?? null
            }
            editorCommand={workspace.resolvedEditorApplication}
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
    <div className="flex h-screen overflow-hidden bg-stone-100">
      {/* Persistent sidebar */}
      <AppSidebar
        assignments={workspace.assignments}
        currentAssignmentId={currentAssignmentId}
        isOnAssignmentsHome={route.page === "assignments"}
        jobs={jobs}
        onDismissJob={(id) => void dismissJob(id)}
        onOpenAssignment={(id) => {
          workspace.setSelectedAssignmentId(id);
          setRoute({ page: "assignment", assignmentId: id, tab: "queue" });
        }}
        onOpenAssignmentsHome={() => setRoute({ page: "assignments" })}
        onOpenSettings={() => {
          void openSettingsWindow().catch((err) => {
            window.alert(`Unable to open settings window.\n\n${String(err)}`);
          });
        }}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {workspace.error ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {workspace.error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden p-4">{pageContent}</div>
      </div>
    </div>
  );
}
