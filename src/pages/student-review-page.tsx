import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { CommitOptions, StudentRepo, SubmissionKind } from "../types/ezta";
import { submissionDisplayName } from "../lib/format";
import { Breadcrumbs } from "../components/navigation/breadcrumbs";
import { Button } from "../components/ui/button";
import { InspectorPane } from "../components/workspace/inspector-pane";

type StudentReviewPageProps = {
  assignmentName: string | null;
  assignmentSubmissionKind: SubmissionKind | null;
  selectedRepo: StudentRepo | null;
  filteredRepoCount: number;
  selectedPosition: number;
  commitOptions: CommitOptions | null;
  pickerTarget: "base" | "submission";
  onPickerTargetChange: (value: "base" | "submission") => void;
  baseInput: string;
  onBaseInputChange: (value: string) => void;
  submissionInput: string;
  onSubmissionInputChange: (value: string) => void;
  notesInput: string;
  onNotesInputChange: (value: string) => void;
  statusInput: string;
  onStatusInputChange: (value: string) => void;
  onLoadCommitOptions: () => void;
  onValidateTarget: () => void;
  onSaveTarget: () => void;
  onSaveRepoMeta: () => void;
  onMarkReviewed: () => void;
  onPrepareReview: () => void;
  onOpenRepoInEditor: () => void;
  onOpenReviewWorkspace: () => void;
  onApplyPickedRevision: (sha: string) => void;
  onOpenAssignments: () => void;
  onOpenDashboard: () => void;
  onOpenPrevious: () => void;
  onOpenNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  selectedAssignmentDeadline: string | null;
  busy: boolean;
};

export function StudentReviewPage({
  assignmentName,
  assignmentSubmissionKind,
  selectedRepo,
  filteredRepoCount,
  selectedPosition,
  commitOptions,
  pickerTarget,
  onPickerTargetChange,
  baseInput,
  onBaseInputChange,
  submissionInput,
  onSubmissionInputChange,
  notesInput,
  onNotesInputChange,
  statusInput,
  onStatusInputChange,
  onLoadCommitOptions,
  onValidateTarget,
  onSaveTarget,
  onSaveRepoMeta,
  onMarkReviewed,
  onPrepareReview,
  onOpenRepoInEditor,
  onOpenReviewWorkspace,
  onApplyPickedRevision,
  onOpenAssignments,
  onOpenDashboard,
  onOpenPrevious,
  onOpenNext,
  hasPrevious,
  hasNext,
  selectedAssignmentDeadline,
  busy,
}: StudentReviewPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <Breadcrumbs
        items={[
          { label: "Assignments", onClick: onOpenAssignments },
          { label: assignmentName ?? "Assignment", onClick: onOpenDashboard },
          {
            label: selectedRepo
              ? submissionDisplayName(selectedRepo, assignmentSubmissionKind)
              : "Submission Review",
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenDashboard}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to queue
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenPrevious}
          disabled={!hasPrevious}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous submission
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenNext}
          disabled={!hasNext}
        >
          Next submission
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <div className="border border-stone-300 bg-white px-3 py-2 text-xs text-stone-600">
          Shortcuts: `alt+j` next, `alt+k` previous, `alt+s` save target,
          `alt+p` prepare PR, `alt+o` open PR, `alt+r` mark reviewed
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <InspectorPane
          selectedRepo={selectedRepo}
          selectedAssignmentSubmissionKind={assignmentSubmissionKind}
          selectedAssignmentDeadline={selectedAssignmentDeadline}
          filteredRepoCount={filteredRepoCount}
          selectedPosition={selectedPosition}
          commitOptions={commitOptions}
          pickerTarget={pickerTarget}
          onPickerTargetChange={onPickerTargetChange}
          baseInput={baseInput}
          onBaseInputChange={onBaseInputChange}
          submissionInput={submissionInput}
          onSubmissionInputChange={onSubmissionInputChange}
          notesInput={notesInput}
          onNotesInputChange={onNotesInputChange}
          statusInput={statusInput}
          onStatusInputChange={onStatusInputChange}
          onLoadCommitOptions={onLoadCommitOptions}
          onValidateTarget={onValidateTarget}
          onSaveTarget={onSaveTarget}
          onSaveRepoMeta={onSaveRepoMeta}
          onMarkReviewed={onMarkReviewed}
          onPrepareReview={onPrepareReview}
          onOpenRepoInEditor={onOpenRepoInEditor}
          onOpenReviewWorkspace={onOpenReviewWorkspace}
          onApplyPickedRevision={onApplyPickedRevision}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onOpenPrevious={onOpenPrevious}
          onOpenNext={onOpenNext}
          busy={busy}
        />
      </div>
    </div>
  );
}
