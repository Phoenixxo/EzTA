import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUpRight,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FolderOpen,
  GitCompareArrows,
  GitPullRequest,
  List,
  LoaderCircle,
  MessageSquarePlus,
  Search,
  Send,
} from "lucide-react";
import type {
  Assignment,
  CommitOptions,
  DraftComment,
  ReviewStatusFilter,
  StudentRepo,
  SubmissionKind,
} from "../../../types/ezta";
import {
  shortSha,
  submissionDisplayName,
  submissionKindLabel,
  submissionMemberSummary,
} from "../../../lib/format";
import { cn } from "../../../lib/utils";
import { openFileInEditor } from "../../../lib/ezta";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { QueueSidebarPane } from "../../../components/workspace/queue-sidebar-pane";
import { StatusBadge } from "../../../components/workspace/status-badge";
import { DraftCommentRow } from "./draft-comment-row";
import { StructuredDiffPane } from "./structured-diff-pane";
import { useReviewWorkspace } from "../hooks/use-review-workspace";
import {
  basename,
  dirname,
  groupChangedFiles,
  lineToneClass,
} from "../lib/diff-view";

// ── Types ─────────────────────────────────────────────────────────────────────

type CombinedReviewWorkspaceProps = {
  assignment: Assignment | null;
  selectedRepo: StudentRepo | null;
  selectedRepoId: number | null;
  assignmentSubmissionKind: SubmissionKind | null;
  repos: StudentRepo[];
  filteredRepos: StudentRepo[];
  filteredRepoCount: number;
  selectedPosition: number;
  statusFilter: ReviewStatusFilter;
  onStatusFilterChange: (value: ReviewStatusFilter) => void;
  repoQuery: string;
  onRepoQueryChange: (value: string) => void;
  onSelectRepo: (id: number | null) => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onOpenPrevious: () => void;
  onOpenNext: () => void;
  commitOptions: CommitOptions | null;
  selectedAssignmentDeadline: string | null;
  pickerTarget: "base" | "submission";
  onPickerTargetChange: (value: "base" | "submission") => void;
  baseInput: string;
  onBaseInputChange: (value: string) => void;
  submissionInput: string;
  onSubmissionInputChange: (value: string) => void;
  onLoadCommitOptions: () => void;
  onValidateTarget: () => void;
  onSaveTarget: () => void;
  onApplyPickedRevision: (sha: string) => void;
  notesInput: string;
  onNotesInputChange: (value: string) => void;
  statusInput: string;
  onStatusInputChange: (value: string) => void;
  onSaveRepoMeta: () => void;
  onMarkReviewed: () => void;
  onPrepareReview: () => void;
  onOpenRepoInEditor: () => void;
  onOpenPr: () => void;
  editorCommand: string;
  busy: boolean;
};

const toolTabs = ["comment", "feedback", "target"] as const;
type ToolTab = (typeof toolTabs)[number];

// ── Main component ────────────────────────────────────────────────────────────

export function CombinedReviewWorkspace({
  assignment,
  selectedRepo,
  selectedRepoId,
  assignmentSubmissionKind,
  repos,
  filteredRepos,
  filteredRepoCount,
  selectedPosition,
  statusFilter,
  onStatusFilterChange,
  repoQuery,
  onRepoQueryChange,
  onSelectRepo,
  hasPrevious,
  hasNext,
  onOpenPrevious,
  onOpenNext,
  commitOptions,
  selectedAssignmentDeadline,
  pickerTarget,
  onPickerTargetChange,
  baseInput,
  onBaseInputChange,
  submissionInput,
  onSubmissionInputChange,
  onLoadCommitOptions,
  onValidateTarget,
  onSaveTarget,
  onApplyPickedRevision,
  notesInput,
  onNotesInputChange,
  statusInput,
  onStatusInputChange,
  onSaveRepoMeta,
  onMarkReviewed,
  onPrepareReview,
  onOpenRepoInEditor,
  onOpenPr,
  editorCommand,
  busy,
}: CombinedReviewWorkspaceProps) {
  const review = useReviewWorkspace(selectedRepo, Boolean(selectedRepo));

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ToolTab>("comment");
  const [viewMode, setViewMode] = useState<"diff" | "source">("diff");
  const [sourceSide, setSourceSide] = useState<"base" | "submission">(
    "submission",
  );
  const [fileQuery, setFileQuery] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [editorError, setEditorError] = useState("");

  // Pane widths  — deliberately conservative defaults so the diff gets space
  const [queueWidth, setQueueWidth] = useState(260);
  const [filePaneWidth, setFilePaneWidth] = useState(220);
  const [toolsWidth, setToolsWidth] = useState(300);

  const dragState = useRef<{
    kind: "queue" | "files" | "tools";
    startX: number;
    startWidth: number;
  } | null>(null);

  // ── Derived values ──────────────────────────────────────────────────────────
  // Show queue as a column when the user toggles it, or when nothing is selected
  const queueVisible = showQueue || !selectedRepo;

  const visibleFiles = useMemo(() => {
    const query = fileQuery.trim().toLowerCase();
    return review.changedFiles.filter((file) => {
      if (!query) return true;
      return [file.path, file.previousPath ?? "", file.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [fileQuery, review.changedFiles]);

  const groupedFiles = useMemo(
    () => groupChangedFiles(visibleFiles),
    [visibleFiles],
  );

  const currentComments = review.draftComments.filter(
    (c) => c.filePath === review.selectedPath,
  );
  const baseComments = currentComments.filter((c) => c.side === "base");
  const submissionComments = currentComments.filter(
    (c) => c.side === "submission",
  );
  const unpublishedCount = review.draftComments.filter(
    (c) => c.publishStatus === "draft" || c.publishStatus === "failed_to_map",
  ).length;
  const queuedComments = review.draftComments.filter(
    (c) => c.publishStatus === "queued_for_review",
  );
  const pendingReview = queuedComments[0] ?? null;

  // ── Effects ─────────────────────────────────────────────────────────────────
  // Reset tool tab when switching submissions
  useEffect(() => {
    setActiveTab("comment");
  }, [selectedRepo?.id]);

  // Expand directory group when a file within it is selected
  useEffect(() => {
    if (!review.selectedPath) return;
    const group = dirname(review.selectedPath);
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.delete(group)) return next;
      return prev;
    });
  }, [review.selectedPath]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function handleMarkReviewedAndNext() {
    onMarkReviewed();
    if (hasNext) onOpenNext();
  }

  function handleSelectRepo(id: number | null) {
    onSelectRepo(id);
    // Auto-close the queue overlay when a submission is picked
    setShowQueue(false);
  }

  function startResize(
    kind: "queue" | "files" | "tools",
    startX: number,
    startWidth: number,
  ) {
    dragState.current = { kind, startX, startWidth };

    function handleMouseMove(event: MouseEvent) {
      const current = dragState.current;
      if (!current) return;
      const delta = event.clientX - current.startX;
      if (current.kind === "queue") {
        setQueueWidth(clamp(current.startWidth + delta, 200, 400));
      } else if (current.kind === "files") {
        setFilePaneWidth(clamp(current.startWidth + delta, 160, 320));
      } else if (current.kind === "tools") {
        // tools panel is on the right — drag left grows it (subtract delta)
        setToolsWidth(clamp(current.startWidth - delta, 240, 480));
      }
    }

    function handleMouseUp() {
      dragState.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 gap-1 overflow-hidden">
      {/* ── Queue overlay column ── */}
      {queueVisible ? (
        <>
          <div className="shrink-0" style={{ width: queueWidth }}>
            <QueueSidebarPane
              assignment={assignment}
              repos={repos}
              filteredRepos={filteredRepos}
              selectedRepoId={selectedRepoId}
              onSelectRepo={handleSelectRepo}
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
              repoQuery={repoQuery}
              onRepoQueryChange={onRepoQueryChange}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              onOpenPrevious={onOpenPrevious}
              onOpenNext={onOpenNext}
              className="h-full w-full"
            />
          </div>
          <ResizeHandle
            label="Resize queue"
            onMouseDown={(e) => startResize("queue", e.clientX, queueWidth)}
          />
        </>
      ) : null}

      {/* ── No submission selected — prompt ── */}
      {!selectedRepo ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-stone-200 bg-white text-sm text-stone-400">
          Select a submission from the queue to begin grading.
        </div>
      ) : (
        /* ── Main review panel ── */
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
          {/* ── Submission header ── */}
          <header className="flex shrink-0 items-center gap-2 border-b border-stone-200 bg-white px-3 py-2.5">
            {/* Queue toggle */}
            <button
              type="button"
              onClick={() => setShowQueue((v) => !v)}
              className={cn(
                "shrink-0 rounded-md p-1.5 transition-colors",
                showQueue
                  ? "bg-violet-100 text-violet-700"
                  : "text-stone-400 hover:bg-stone-100 hover:text-stone-700",
              )}
              aria-label={showQueue ? "Hide queue" : "Show queue"}
              title={showQueue ? "Hide queue" : "Show queue"}
            >
              <List className="h-4 w-4" />
            </button>

            {/* Submission info */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-stone-900">
                {submissionDisplayName(selectedRepo, assignmentSubmissionKind)}
              </div>
              <div className="truncate text-xs text-stone-400">
                {submissionKindLabel(selectedRepo, assignmentSubmissionKind)}
                {" · "}
                {selectedRepo.repoOwner}/{selectedRepo.repoName}
                {submissionMemberSummary(selectedRepo)
                  ? ` · ${submissionMemberSummary(selectedRepo)}`
                  : null}
              </div>
            </div>

            {/* Status + position + navigation */}
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={selectedRepo.reviewStatus} />
              <button
                type="button"
                onClick={onOpenPrevious}
                disabled={!hasPrevious}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                aria-label="Previous submission"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center text-[11px] tabular-nums text-stone-500">
                {selectedPosition}/{filteredRepoCount || 1}
              </span>
              <button
                type="button"
                onClick={onOpenNext}
                disabled={!hasNext}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                aria-label="Next submission"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* ── Three-column content area ── */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* File list */}
            <aside
              className="flex shrink-0 flex-col border-r border-stone-200 bg-stone-50"
              style={{ width: filePaneWidth }}
            >
              <div className="border-b border-stone-200 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    value={fileQuery}
                    onChange={(e) => setFileQuery(e.currentTarget.value)}
                    placeholder="Search files"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {groupedFiles.map((group) => {
                  const isCollapsed =
                    !fileQuery.trim() && collapsedGroups.has(group.label);
                  return (
                    <div key={group.label} className="mb-3">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.label)}
                        className="mb-1 flex w-full items-center gap-1 border-b border-stone-200 px-1 pb-1 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 hover:bg-stone-100"
                      >
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 shrink-0 transition-transform",
                            isCollapsed ? "-rotate-90" : "",
                          )}
                        />
                        <span className="truncate">{group.label}</span>
                      </button>
                      {!isCollapsed ? (
                        <div className="space-y-1">
                          {group.files.map((file) => (
                            <button
                              key={file.path}
                              type="button"
                              onClick={() => review.setSelectedPath(file.path)}
                              className={cn(
                                "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                                review.selectedPath === file.path
                                  ? "border-violet-500 bg-violet-50"
                                  : "border-stone-200 bg-white hover:border-stone-300",
                              )}
                            >
                              <div className="truncate text-xs font-medium text-stone-900">
                                {basename(file.path)}
                              </div>
                              <div className="truncate text-[11px] text-stone-400">
                                {file.path}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {visibleFiles.length === 0 ? (
                  <div className="rounded-md border border-dashed border-stone-200 bg-white px-3 py-4 text-sm text-stone-500">
                    No changed files match.
                  </div>
                ) : null}
              </div>
            </aside>

            <ResizeHandle
              label="Resize file list"
              onMouseDown={(e) =>
                startResize("files", e.clientX, filePaneWidth)
              }
            />

            {/* Diff / source pane */}
            <div
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              style={{ minWidth: 320 }}
            >
              {/* File toolbar */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-stone-800">
                    {review.selectedPath ?? "No file selected"}
                  </div>
                  <div className="truncate text-[11px] text-stone-500">
                    {review.busy
                      ? "Loading…"
                      : viewMode === "diff"
                        ? "Submission viewer"
                        : sourceSide === "base"
                          ? "Base source"
                          : "Submission source"}
                    {review.error ? ` · ${review.error}` : ""}
                    {editorError ? ` · ${editorError}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* Diff / Source toggle */}
                  <div className="inline-flex rounded-md border border-stone-200 bg-white p-0.5">
                    <Button
                      size="sm"
                      variant={viewMode === "diff" ? "default" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setViewMode("diff")}
                    >
                      Diff
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === "source" ? "default" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setViewMode("source")}
                    >
                      Source
                    </Button>
                  </div>
                  {/* Base / Submission source-side toggle */}
                  {viewMode === "source" ? (
                    <div className="inline-flex rounded-md border border-stone-200 bg-white p-0.5">
                      <Button
                        size="sm"
                        variant={sourceSide === "base" ? "default" : "ghost"}
                        className="h-7 px-2 text-xs"
                        onClick={() => setSourceSide("base")}
                      >
                        Base
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          sourceSide === "submission" ? "default" : "ghost"
                        }
                        className="h-7 px-2 text-xs"
                        onClick={() => setSourceSide("submission")}
                      >
                        Submission
                      </Button>
                    </div>
                  ) : null}
                  {/* Open file in editor */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    title="Open current file in editor"
                    disabled={!review.selectedPath}
                    onClick={() => {
                      if (!review.selectedPath) return;
                      setEditorError("");
                      void openFileInEditor({
                        studentRepoId: selectedRepo.id,
                        filePath: review.selectedPath,
                        editorCommand,
                      }).catch((err) => setEditorError(String(err)));
                    }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    File
                  </Button>
                </div>
              </div>

              {/* Diff or source content */}
              {viewMode === "diff" ? (
                <StructuredDiffPane
                  diff={review.diffResult?.diff ?? ""}
                  comments={currentComments}
                  draftSide={review.draftSide}
                  selectedStartLine={Number(review.draftStartLine) || 1}
                  selectedEndLine={Number(review.draftEndLine) || 1}
                  onSelectionChange={(side, startLine, endLine) => {
                    review.setDraftSide(side);
                    review.setDraftStartLine(String(startLine));
                    review.setDraftEndLine(String(endLine));
                    setActiveTab("comment");
                  }}
                />
              ) : (
                <SelectableCodePane
                  side={sourceSide}
                  content={
                    sourceSide === "base"
                      ? (review.baseContent?.content ?? "")
                      : (review.submissionContent?.content ?? "")
                  }
                  comments={
                    sourceSide === "base" ? baseComments : submissionComments
                  }
                  selectedStartLine={
                    review.draftSide === sourceSide
                      ? Number(review.draftStartLine) || 1
                      : null
                  }
                  selectedEndLine={
                    review.draftSide === sourceSide
                      ? Number(review.draftEndLine) || 1
                      : null
                  }
                  emptyMessage={
                    sourceSide === "base"
                      ? "No base-side file content."
                      : "No submission-side file content."
                  }
                  onSelectionChange={(startLine, endLine) => {
                    review.setDraftSide(sourceSide);
                    review.setDraftStartLine(String(startLine));
                    review.setDraftEndLine(String(endLine));
                    setActiveTab("comment");
                  }}
                />
              )}
            </div>
          </div>

          {/* ── Footer actions ── */}
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-stone-200 bg-stone-50 px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="accent"
                className="h-8 px-2.5 text-xs"
                onClick={onPrepareReview}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitPullRequest className="h-3.5 w-3.5" />
                )}
                Prepare
              </Button>
              {selectedRepo.prUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs"
                  title="Open pull request"
                  onClick={onOpenPr}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Open PR
                </Button>
              ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            title="Open repository in editor"
            onClick={() => void onOpenRepoInEditor()}
            disabled={busy}
          >
                <FolderOpen className="h-3.5 w-3.5" />
                Editor
              </Button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 px-2.5 text-xs"
              onClick={handleMarkReviewedAndNext}
              disabled={busy}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {hasNext ? "Mark reviewed & next" : "Mark reviewed"}
            </Button>
          </footer>
        </section>
      )}

      {/* Tools panel — only when a submission is selected */}
      {selectedRepo ? (
        <>
          <ResizeHandle
            label="Resize review tools"
            onMouseDown={(e) => startResize("tools", e.clientX, toolsWidth)}
          />
          <aside
            className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white"
            style={{ width: toolsWidth }}
          >
            {/* Two-tab bar */}
            <div className="flex shrink-0 border-b border-stone-200 bg-stone-50 px-2 pt-2">
              {toolTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                    activeTab === tab
                      ? "text-violet-700"
                      : "text-stone-500 hover:text-stone-800",
                  )}
                >
                  {tab}
                  {tab === "comment" && unpublishedCount > 0 ? (
                    <span className="ml-1 rounded-full bg-amber-400 px-1 py-0.5 text-[9px] font-bold leading-none text-stone-900">
                      {unpublishedCount}
                    </span>
                  ) : null}
                  {activeTab === tab ? (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-violet-600" />
                  ) : null}
                </button>
              ))}
            </div>

            {/* Tab content — overflow-x-hidden so panel contents never force a horizontal scrollbar */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {activeTab === "comment" ? (
                <CommentTab
                  selectedPath={review.selectedPath}
                  currentComments={currentComments}
                  draftBody={review.draftBody}
                  setDraftBody={review.setDraftBody}
                  draftStartLine={review.draftStartLine}
                  setDraftStartLine={review.setDraftStartLine}
                  draftEndLine={review.draftEndLine}
                  setDraftEndLine={review.setDraftEndLine}
                  draftSide={review.draftSide}
                  setDraftSide={review.setDraftSide}
                  createComment={review.createComment}
                  updateComment={review.updateComment}
                  removeComment={review.removeComment}
                  selectedRepo={selectedRepo}
                  busy={review.busy}
                  unpublishedCount={unpublishedCount}
                  queuedComments={queuedComments}
                  pendingReview={pendingReview}
                  reviewSubmissionBody={review.reviewSubmissionBody}
                  setReviewSubmissionBody={review.setReviewSubmissionBody}
                  publishComments={review.publishComments}
                  submitQueuedReview={review.submitQueuedReview}
                  discardQueuedReview={review.discardQueuedReview}
                />
              ) : activeTab === "feedback" ? (
                <FeedbackTab
                  notesInput={notesInput}
                  onNotesInputChange={onNotesInputChange}
                  statusInput={statusInput}
                  onStatusInputChange={onStatusInputChange}
                  onSaveRepoMeta={onSaveRepoMeta}
                  busy={busy}
                />
              ) : (
                <TargetTab
                  selectedAssignmentDeadline={selectedAssignmentDeadline}
                  commitOptions={commitOptions}
                  baseInput={baseInput}
                  onBaseInputChange={onBaseInputChange}
                  submissionInput={submissionInput}
                  onSubmissionInputChange={onSubmissionInputChange}
                  onLoadCommitOptions={onLoadCommitOptions}
                  onValidateTarget={onValidateTarget}
                  onSaveTarget={onSaveTarget}
                  onApplyPickedRevision={onApplyPickedRevision}
                  pickerTarget={pickerTarget}
                  onPickerTargetChange={onPickerTargetChange}
                  busy={busy}
                />
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ── Resize handle ─────────────────────────────────────────────────────────────

function ResizeHandle({
  label,
  onMouseDown,
}: {
  label: string;
  onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={onMouseDown}
      className="group relative my-1 w-1.5 shrink-0 cursor-col-resize rounded-full bg-transparent hover:bg-violet-100"
    >
      <span className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-300 transition-colors group-hover:bg-violet-400" />
    </button>
  );
}

// ── Target tab ───────────────────────────────────────────────────────────────

function TargetTab({
  selectedAssignmentDeadline,
  commitOptions,
  baseInput,
  onBaseInputChange,
  submissionInput,
  onSubmissionInputChange,
  onLoadCommitOptions,
  onValidateTarget,
  onSaveTarget,
  onApplyPickedRevision,
  pickerTarget,
  onPickerTargetChange,
  busy,
}: {
  selectedAssignmentDeadline: string | null;
  commitOptions: CommitOptions | null;
  baseInput: string;
  onBaseInputChange: (v: string) => void;
  submissionInput: string;
  onSubmissionInputChange: (v: string) => void;
  onLoadCommitOptions: () => void;
  onValidateTarget: () => void;
  onSaveTarget: () => void;
  onApplyPickedRevision: (sha: string) => void;
  pickerTarget: "base" | "submission";
  onPickerTargetChange: (v: "base" | "submission") => void;
  busy: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const submissionIsDeadlineSuggestion =
    Boolean(submissionInput) &&
    submissionInput === commitOptions?.deadlineSubmissionSha;

  function selectionFor(sha: string) {
    return {
      matchesBase: Boolean(baseInput) && baseInput === sha,
      matchesSubmission: Boolean(submissionInput) && submissionInput === sha,
      isSelected: baseInput === sha || submissionInput === sha,
    };
  }

  return (
    <div className="w-full min-w-0 space-y-3 p-3">
      {/* Target summary */}
      <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          Target summary
        </div>
        <div className="grid gap-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-20 shrink-0 text-stone-500">Base</span>
            {baseInput ? (
              <span
                className="truncate font-mono text-stone-800"
                title={baseInput}
              >
                {shortSha(baseInput)}
              </span>
            ) : (
              <span className="text-red-500">Missing</span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-20 shrink-0 text-stone-500">Submission</span>
            {submissionInput ? (
              <span
                className="truncate font-mono text-stone-800"
                title={submissionInput}
              >
                {shortSha(submissionInput)}
              </span>
            ) : (
              <span className="text-red-500">Missing</span>
            )}
            {submissionIsDeadlineSuggestion ? (
              <span className="ml-auto shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                suggested
              </span>
            ) : null}
          </div>
          {selectedAssignmentDeadline ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-20 shrink-0 text-stone-500">Deadline</span>
              <span className="truncate text-stone-700">
                {selectedAssignmentDeadline}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Deadline suggestion */}
      {commitOptions?.deadlineSubmissionSha ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
            Suggested target
          </div>
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="truncate font-mono text-amber-900">
              {shortSha(commitOptions.deadlineSubmissionSha)}
            </span>
            {commitOptions.deadlineSubmissionEventAt ? (
              <span className="shrink-0 text-amber-700">
                {commitOptions.deadlineSubmissionEventAt}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-[11px] text-amber-600">
            Last push at or before deadline
          </div>
          <Button
            size="sm"
            variant="accent"
            className="mt-2"
            onClick={() =>
              onSubmissionInputChange(commitOptions.deadlineSubmissionSha!)
            }
          >
            Use suggested submission
          </Button>
        </div>
      ) : null}

      {/* Actions — always visible */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onLoadCommitOptions}
          disabled={busy}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          Load options
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onValidateTarget}
          disabled={busy}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Validate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSaveTarget}
          disabled={busy}
        >
          Save target
        </Button>
      </div>

      {/* Advanced SHA inputs */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400 transition-colors hover:text-stone-600"
        >
          {showAdvanced ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Advanced SHA inputs
        </button>
        {showAdvanced ? (
          <div className="mt-1.5 space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3">
            <label className="block space-y-1 text-xs font-medium text-stone-500">
              Base SHA
              <Input
                value={baseInput}
                onChange={(e) => onBaseInputChange(e.currentTarget.value)}
                placeholder="Base SHA"
                className="mt-1 h-8 font-mono text-xs"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-stone-500">
              Submission SHA
              <Input
                value={submissionInput}
                onChange={(e) => onSubmissionInputChange(e.currentTarget.value)}
                placeholder="Submission SHA"
                className="mt-1 h-8 font-mono text-xs"
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* Revision picker */}
      {(commitOptions?.refs.length ?? 0) +
        (commitOptions?.recentCommits.length ?? 0) >
      0 ? (
        <>
          <div className="border-t border-stone-200 pt-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Pick revision
              </span>
              <div className="ml-auto inline-flex rounded-md border border-stone-200 bg-white p-0.5">
                {(["base", "submission"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onPickerTargetChange(t)}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-semibold capitalize transition-colors",
                      pickerTarget === t
                        ? "bg-violet-600 text-white"
                        : "text-stone-500 hover:text-stone-800",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {commitOptions?.refs.length ? (
            <RevisionGroup
              title="Refs"
              items={commitOptions.refs.map((r) => ({
                key: `${r.kind}-${r.name}`,
                label: r.name,
                sub: r.kind,
                sha: r.target,
              }))}
              selectionFor={selectionFor}
              onApply={onApplyPickedRevision}
            />
          ) : null}
          {commitOptions?.recentCommits.length ? (
            <RevisionGroup
              title="Recent commits"
              items={commitOptions.recentCommits.map((c) => ({
                key: c.sha,
                label: c.summary || "(no summary)",
                sub: c.committedAt
                  ? new Date(c.committedAt).toLocaleString()
                  : "",
                sha: c.sha,
              }))}
              selectionFor={selectionFor}
              onApply={onApplyPickedRevision}
            />
          ) : null}
        </>
      ) : (
        <div className="rounded-md border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-xs text-stone-500">
          Click <span className="font-medium text-stone-700">Load options</span>{" "}
          to browse refs and recent commits.
        </div>
      )}
    </div>
  );
}

function RevisionGroup({
  title,
  items,
  selectionFor,
  onApply,
}: {
  title: string;
  items: { key: string; label: string; sub: string; sha: string }[];
  selectionFor: (sha: string) => {
    matchesBase: boolean;
    matchesSubmission: boolean;
    isSelected: boolean;
  };
  onApply: (sha: string) => void;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white">
      <div className="border-b border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
        {title}
      </div>
      <div className="divide-y divide-stone-100">
        {items.map((item) => {
          const sel = selectionFor(item.sha);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onApply(item.sha)}
              className={cn(
                "flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
                sel.isSelected ? "bg-violet-50" : "hover:bg-stone-50",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-stone-900">
                  {item.label}
                </span>
                <span className="block truncate text-[11px] text-stone-400">
                  {item.sub}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {sel.matchesBase ? (
                  <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    base
                  </span>
                ) : null}
                {sel.matchesSubmission ? (
                  <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-semibold text-stone-900">
                    sub
                  </span>
                ) : null}
                <span className="font-mono text-[10px] text-stone-400">
                  {shortSha(item.sha)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Comment tab ───────────────────────────────────────────────────────────────

function CommentTab({
  selectedPath,
  currentComments,
  draftBody,
  setDraftBody,
  draftStartLine,
  setDraftStartLine,
  draftEndLine,
  setDraftEndLine,
  draftSide,
  setDraftSide,
  createComment,
  updateComment,
  removeComment,
  selectedRepo,
  busy,
  unpublishedCount,
  queuedComments,
  pendingReview,
  reviewSubmissionBody,
  setReviewSubmissionBody,
  publishComments,
  submitQueuedReview,
  discardQueuedReview,
}: {
  selectedPath: string | null;
  currentComments: DraftComment[];
  draftBody: string;
  setDraftBody: (v: string) => void;
  draftStartLine: string;
  setDraftStartLine: (v: string) => void;
  draftEndLine: string;
  setDraftEndLine: (v: string) => void;
  draftSide: string;
  setDraftSide: (v: string) => void;
  createComment: () => Promise<void>;
  updateComment: (
    id: number,
    input: {
      body: string;
      startLine: number;
      lineNumber: number;
      side: string;
    },
  ) => Promise<void>;
  removeComment: (id: number) => Promise<void>;
  selectedRepo: StudentRepo;
  busy: boolean;
  unpublishedCount: number;
  queuedComments: DraftComment[];
  pendingReview: DraftComment | null;
  reviewSubmissionBody: string;
  setReviewSubmissionBody: (v: string) => void;
  publishComments: () => Promise<void>;
  submitQueuedReview: () => Promise<void>;
  discardQueuedReview: () => Promise<void>;
}) {
  return (
    <div className="grid min-h-full w-full min-w-0 grid-rows-[auto_1fr_auto] bg-stone-50">
      {/* Draft form */}
      <div className="space-y-2 border-b border-stone-200 p-3">
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
          <div className="truncate font-medium text-stone-900">
            {selectedPath ?? "No file selected"}
          </div>
          <div className="truncate">
            {draftSide} lines {draftStartLine || "1"}–{draftEndLine || "1"}
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[72px_72px_minmax(0,1fr)] gap-1.5">
          <Input
            value={draftStartLine}
            onChange={(e) => setDraftStartLine(e.currentTarget.value)}
            placeholder="Start"
            className="h-8 min-w-0 text-xs"
          />
          <Input
            value={draftEndLine}
            onChange={(e) => setDraftEndLine(e.currentTarget.value)}
            placeholder="End"
            className="h-8 min-w-0 text-xs"
          />
          <select
            value={draftSide}
            onChange={(e) => setDraftSide(e.currentTarget.value)}
            className="h-8 w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 text-xs"
          >
            <option value="submission">submission</option>
            <option value="base">base</option>
          </select>
        </div>
        <Textarea
          value={draftBody}
          onChange={(e) => setDraftBody(e.currentTarget.value)}
          rows={5}
          placeholder="Write a line-specific review comment"
        />
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={() => void createComment()}
          disabled={!selectedPath || !draftBody.trim() || busy}
          className="w-full"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Save draft comment
        </Button>

        {/* Pending review queue control */}
        {!selectedRepo.prNumber ? (
          <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
            Prepare the PR before publishing drafts to GitHub.
          </div>
        ) : null}
        {pendingReview ? (
          <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950">
            <div className="font-semibold uppercase tracking-[0.12em]">
              Pending review queued
            </div>
            <div>
              {queuedComments.length} comment
              {queuedComments.length === 1 ? "" : "s"} attached
            </div>
            <Textarea
              value={reviewSubmissionBody}
              onChange={(e) => setReviewSubmissionBody(e.currentTarget.value)}
              rows={3}
              placeholder="Optional GitHub review summary"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant="accent"
                onClick={() => void submitQueuedReview()}
                disabled={busy}
              >
                <Send className="h-3.5 w-3.5" />
                Submit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void discardQueuedReview()}
                disabled={busy}
              >
                Discard
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void publishComments()}
            disabled={!selectedRepo.prNumber || unpublishedCount === 0 || busy}
            className="w-full"
          >
            <Send className="h-3.5 w-3.5" />
            Queue pending review
          </Button>
        )}
      </div>

      {/* Existing draft comments for this file */}
      <div className="min-h-0 overflow-y-auto p-2">
        {currentComments.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-200 bg-white px-3 py-4 text-sm text-stone-500">
            No draft comments for this file yet.
          </div>
        ) : null}
        <div className="space-y-2">
          {currentComments.map((comment) => (
            <DraftCommentRow
              key={comment.id}
              onDelete={() => void removeComment(comment.id)}
              onSave={(input) => void updateComment(comment.id, input)}
              comment={comment}
              locked={comment.publishStatus === "queued_for_review"}
            />
          ))}
        </div>
      </div>

      {/* Summary badge */}
      {unpublishedCount > 0 ? (
        <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
          <span className="font-semibold text-stone-900">
            {unpublishedCount}
          </span>{" "}
          draft comment{unpublishedCount === 1 ? "" : "s"} ready to publish
        </div>
      ) : null}
    </div>
  );
}

// ── Feedback tab ──────────────────────────────────────────────────────────────

function FeedbackTab({
  notesInput,
  onNotesInputChange,
  statusInput,
  onStatusInputChange,
  onSaveRepoMeta,
  busy,
}: {
  notesInput: string;
  onNotesInputChange: (v: string) => void;
  statusInput: string;
  onStatusInputChange: (v: string) => void;
  onSaveRepoMeta: () => void;
  busy: boolean;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [savedNotes, setSavedNotes] = useState(notesInput);
  const [savedStatus, setSavedStatus] = useState(statusInput);
  const isDirty = notesInput !== savedNotes || statusInput !== savedStatus;

  function handleSave() {
    setSavedNotes(notesInput);
    setSavedStatus(statusInput);
    onSaveRepoMeta();
  }

  return (
    <div className="space-y-4 p-4">
      <label className="block space-y-1.5 text-xs font-medium text-stone-500">
        Review status
        <select
          value={statusInput}
          onChange={(e) => onStatusInputChange(e.currentTarget.value)}
          className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-violet-400"
        >
          <option value="not_started">Not started</option>
          <option value="prepared">Prepared</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </label>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-stone-500">
            Overall feedback
          </span>
          {isDirty ? (
            <span className="ml-1 text-[10px] font-medium text-amber-600">
              unsaved
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("write")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === "write"
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:bg-stone-100",
              )}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === "preview"
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:bg-stone-100",
              )}
            >
              Preview
            </button>
            <span className="ml-1 font-mono text-[10px] text-stone-400">
              MD
            </span>
          </div>
        </div>
        {mode === "write" ? (
          <Textarea
            value={notesInput}
            onChange={(e) => onNotesInputChange(e.currentTarget.value)}
            rows={14}
            placeholder="Overall grading feedback, reminders, rubric notes"
          />
        ) : (
          <MarkdownPreview value={notesInput} />
        )}
      </div>

      <Button
        size="sm"
        variant="secondary"
        onClick={handleSave}
        disabled={busy}
      >
        Save feedback
      </Button>
    </div>
  );
}

// ── Markdown preview ──────────────────────────────────────────────────────────

function MarkdownPreview({ value }: { value: string }) {
  return (
    <div className="min-h-[160px] rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm [&_a]:text-violet-600 [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-600 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_li]:mb-0.5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-stone-900 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-stone-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-stone-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-stone-300 [&_th]:bg-stone-100 [&_th]:px-2 [&_th]:py-1 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4">
      {value.trim() ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
      ) : (
        <span className="italic text-stone-400">Nothing to preview.</span>
      )}
    </div>
  );
}

// ── Selectable source pane ────────────────────────────────────────────────────

function SelectableCodePane({
  side,
  content,
  comments,
  selectedStartLine,
  selectedEndLine,
  emptyMessage,
  onSelectionChange,
}: {
  side: "base" | "submission";
  content: string;
  comments: DraftComment[];
  selectedStartLine: number | null;
  selectedEndLine: number | null;
  emptyMessage: string;
  onSelectionChange: (startLine: number, endLine: number) => void;
}) {
  const [dragStartLine, setDragStartLine] = useState<number | null>(null);
  const [dragEndLine, setDragEndLine] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    function handleMouseUp() {
      setDragging(false);
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragging]);

  if (!content) {
    return <div className="p-4 text-xs text-stone-500">{emptyMessage}</div>;
  }

  const lines = content.split("\n");
  const activeStart = dragging ? dragStartLine : selectedStartLine;
  const activeEnd = dragging ? dragEndLine : selectedEndLine;

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-inherit">
      <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-stone-500">
        Drag across lines to target {side} comment ranges.
      </div>
      <div className="select-none font-mono text-xs leading-5 text-stone-800">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isSelected =
            activeStart !== null &&
            activeEnd !== null &&
            lineNumber >= Math.min(activeStart, activeEnd) &&
            lineNumber <= Math.max(activeStart, activeEnd);
          const matchingComments = comments.filter(
            (c) => lineNumber >= c.startLine && lineNumber <= c.lineNumber,
          );
          const toneClass = lineToneClass(matchingComments, isSelected);

          return (
            <div
              key={`${side}-${lineNumber}`}
              className={cn(
                "grid grid-cols-[3.5rem_minmax(0,1fr)] border-b border-stone-100",
                toneClass,
              )}
              onMouseDown={() => {
                setDragging(true);
                setDragStartLine(lineNumber);
                setDragEndLine(lineNumber);
                onSelectionChange(lineNumber, lineNumber);
              }}
              onMouseEnter={() => {
                if (!dragging || dragStartLine === null) return;
                setDragEndLine(lineNumber);
                onSelectionChange(dragStartLine, lineNumber);
              }}
            >
              <div className="border-r border-stone-200 px-2 py-0.5 text-right text-[11px] text-stone-400">
                {lineNumber}
              </div>
              <div className="flex min-w-0 items-start justify-between gap-3 px-3 py-0.5">
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">
                  {line || " "}
                </span>
                {matchingComments.length > 0 ? (
                  <span className="shrink-0 border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-stone-600">
                    {matchingComments.length} comment
                    {matchingComments.length > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
