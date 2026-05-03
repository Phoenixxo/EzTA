import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUpRight,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  FileCode,
  FolderOpen,
  GitCompareArrows,
  GitPullRequest,
  LoaderCircle,
  NotebookPen,
} from "lucide-react";
import {
  shortSha,
  submissionDisplayName,
  submissionKindLabel,
  submissionMemberSummary,
} from "../../lib/format";
import { openExternalLink } from "../../lib/ezta";
import { cn } from "../../lib/utils";
import type {
  CommitOptions,
  StudentRepo,
  SubmissionKind,
} from "../../types/ezta";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { StatusBadge } from "./status-badge";

type InspectorPaneProps = {
  selectedRepo: StudentRepo | null;
  selectedAssignmentSubmissionKind: SubmissionKind | null;
  selectedAssignmentDeadline: string | null;
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
  hasPrevious: boolean;
  hasNext: boolean;
  onOpenPrevious: () => void;
  onOpenNext: () => void;
  busy: boolean;
};

const inspectorTabs = ["target", "feedback", "revisions"] as const;

export function InspectorPane({
  selectedRepo,
  selectedAssignmentSubmissionKind,
  selectedAssignmentDeadline,
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
  hasPrevious,
  hasNext,
  onOpenPrevious,
  onOpenNext,
  busy,
}: InspectorPaneProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof inspectorTabs)[number]>("target");
  const [showAdvancedTarget, setShowAdvancedTarget] = useState(false);

  function getRevisionSelectionState(sha: string) {
    const matchesBase = Boolean(baseInput) && baseInput === sha;
    const matchesSubmission =
      Boolean(submissionInput) && submissionInput === sha;
    return {
      matchesBase,
      matchesSubmission,
      isSelected: matchesBase || matchesSubmission,
    };
  }

  const revisionCount = useMemo(() => {
    return (
      (commitOptions?.refs.length ?? 0) +
      (commitOptions?.recentCommits.length ?? 0)
    );
  }, [commitOptions]);

  // Derive target readiness: ready | error | missing
  const targetState = useMemo<
    "ready" | "error" | "missing_base" | "missing_sub" | "missing_both"
  >(() => {
    if (selectedRepo?.lastError) return "error";
    if (!baseInput && !submissionInput) return "missing_both";
    if (!baseInput) return "missing_base";
    if (!submissionInput) return "missing_sub";
    return "ready";
  }, [selectedRepo?.lastError, baseInput, submissionInput]);

  const targetReady = targetState === "ready";

  // Whether the submission SHA was derived from the deadline suggestion
  const submissionIsDeadlineSuggestion =
    Boolean(submissionInput) &&
    submissionInput === commitOptions?.deadlineSubmissionSha;

  function handleMarkReviewedAndNext() {
    onMarkReviewed();
    if (hasNext) onOpenNext();
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
      {selectedRepo ? (
        <>
          {/* ── Submission header ── */}
          <div className="border-b border-stone-200 bg-white px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-stone-900">
                  {submissionDisplayName(
                    selectedRepo,
                    selectedAssignmentSubmissionKind,
                  )}
                </div>
                <div className="truncate text-xs text-stone-400">
                  {submissionKindLabel(
                    selectedRepo,
                    selectedAssignmentSubmissionKind,
                  )}
                </div>
                <div className="truncate text-xs text-stone-400">
                  {selectedRepo.repoOwner}/{selectedRepo.repoName}
                </div>
                {submissionMemberSummary(selectedRepo) ? (
                  <div className="truncate text-xs text-stone-400">
                    {submissionMemberSummary(selectedRepo)}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge status={selectedRepo.reviewStatus} />
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={onOpenPrevious}
                    disabled={!hasPrevious}
                    className="rounded p-0.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                    aria-label="Previous submission"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-[11px] tabular-nums text-stone-400">
                    {selectedPosition}/{filteredRepoCount || 1}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenNext}
                    disabled={!hasNext}
                    className="rounded p-0.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                    aria-label="Next submission"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab bar ── */}
          <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {inspectorTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
                    activeTab === tab
                      ? "bg-violet-600 text-white"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
                  )}
                >
                  {tab === "revisions"
                    ? `revisions${revisionCount ? ` (${revisionCount})` : ""}`
                    : tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            {/* ── Target tab ── */}
            {activeTab === "target" ? (
              <div className="space-y-3 p-4">
                {/* Target summary */}
                <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3">
                  <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                    Target summary
                  </div>
                  <div className="grid gap-2 text-xs">
                    {/* Base row */}
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-stone-500">Base</span>
                      {baseInput ? (
                        <span
                          className="font-mono text-stone-800"
                          title={baseInput}
                        >
                          {shortSha(baseInput)}
                        </span>
                      ) : (
                        <span className="text-red-500">Missing</span>
                      )}
                      {baseInput &&
                      (selectedRepo.baseLabel ||
                        selectedRepo.baseBranchName) ? (
                        <span className="truncate text-stone-400">
                          {selectedRepo.baseLabel ??
                            selectedRepo.baseBranchName}
                        </span>
                      ) : null}
                    </div>

                    {/* Submission row */}
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-stone-500">
                        Submission
                      </span>
                      {submissionInput ? (
                        <span
                          className="font-mono text-stone-800"
                          title={submissionInput}
                        >
                          {shortSha(submissionInput)}
                        </span>
                      ) : (
                        <span className="text-red-500">Missing</span>
                      )}
                      {submissionInput &&
                      (selectedRepo.submissionLabel ||
                        selectedRepo.submissionBranchName) ? (
                        <span className="truncate text-stone-400">
                          {selectedRepo.submissionLabel ??
                            selectedRepo.submissionBranchName}
                        </span>
                      ) : null}
                      {submissionIsDeadlineSuggestion ? (
                        <span className="ml-auto shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          suggested
                        </span>
                      ) : null}
                    </div>

                    {/* Deadline row */}
                    {selectedAssignmentDeadline ? (
                      <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-stone-500">
                          Deadline
                        </span>
                        <span className="text-stone-700">
                          {selectedAssignmentDeadline}
                        </span>
                      </div>
                    ) : null}

                    {/* Validation state row */}
                    <div className="flex items-start gap-2 border-t border-stone-200 pt-2">
                      <span className="w-20 shrink-0 text-stone-500">
                        Validation
                      </span>
                      <div className="min-w-0 flex-1">
                        {targetState === "ready" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CircleCheck className="h-3 w-3 shrink-0" />
                            Ready
                          </span>
                        ) : targetState === "error" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <CircleAlert className="h-3 w-3 shrink-0" />
                              Validation failed
                            </span>
                            {selectedRepo.lastError ? (
                              <div className="mt-1 text-[11px] text-red-600 break-words">
                                {selectedRepo.lastError}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <CircleDashed className="h-3 w-3 shrink-0" />
                            {targetState === "missing_both"
                              ? "Missing base and submission SHA"
                              : targetState === "missing_base"
                                ? "Missing base SHA"
                                : "Missing submission SHA"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggested target — only when deadline suggestion available */}
                {commitOptions?.deadlineSubmissionSha ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                      Suggested target
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-amber-900">
                        {shortSha(commitOptions.deadlineSubmissionSha)}
                      </span>
                      {commitOptions.deadlineSubmissionEventAt ? (
                        <span className="text-amber-700">
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
                      className="mt-2.5"
                      onClick={() =>
                        onSubmissionInputChange(
                          commitOptions.deadlineSubmissionSha!,
                        )
                      }
                    >
                      Use suggested submission
                    </Button>
                  </div>
                ) : null}

                {/* Target actions — always visible */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onLoadCommitOptions}
                    disabled={busy}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    Load target options
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onValidateTarget}
                    disabled={busy}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Validate target
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSaveTarget}
                    disabled={busy}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    Save target
                  </Button>
                </div>

                {/* Advanced target details — collapsible SHA inputs */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedTarget((v) => !v)}
                    className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400 transition-colors hover:text-stone-600"
                  >
                    {showAdvancedTarget ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    Advanced target details
                  </button>

                  {showAdvancedTarget ? (
                    <div className="mt-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-3">
                      <div className="grid gap-3 2xl:grid-cols-2">
                        <label className="min-w-0 space-y-1.5 text-xs font-medium text-stone-500">
                          Base SHA
                          <Input
                            value={baseInput}
                            onChange={(event) =>
                              onBaseInputChange(event.currentTarget.value)
                            }
                            placeholder="Base SHA"
                            className="mt-1 h-9 font-mono"
                          />
                        </label>
                        <label className="min-w-0 space-y-1.5 text-xs font-medium text-stone-500">
                          Submission SHA
                          <Input
                            value={submissionInput}
                            onChange={(event) =>
                              onSubmissionInputChange(event.currentTarget.value)
                            }
                            placeholder="Submission SHA"
                            className="mt-1 h-9 font-mono"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* ── Feedback tab ── */}
            {activeTab === "feedback" ? (
              <FeedbackTabContent
                notesInput={notesInput}
                onNotesInputChange={onNotesInputChange}
                statusInput={statusInput}
                onStatusInputChange={onStatusInputChange}
                onSaveRepoMeta={onSaveRepoMeta}
                busy={busy}
              />
            ) : null}

            {/* ── Revisions tab ── */}
            {activeTab === "revisions" ? (
              <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4 p-4 xl:grid-cols-2 xl:grid-rows-[minmax(0,1fr)_auto]">
                {/* Refs */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <div className="border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stone-500">
                    Refs
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-1 pb-3">
                    {commitOptions?.refs.length ? (
                      commitOptions.refs.map((ref) => {
                        const selection = getRevisionSelectionState(ref.target);
                        return (
                          <button
                            key={`${ref.kind}-${ref.name}`}
                            type="button"
                            onClick={() => onApplyPickedRevision(ref.target)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left",
                              selection.isSelected
                                ? "border-violet-200 bg-violet-50"
                                : "hover:bg-stone-50",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-stone-900">
                                {ref.name}
                              </div>
                              <div className="text-[11px] uppercase tracking-widest text-stone-400">
                                {ref.kind}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selection.matchesBase ? (
                                <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  base
                                </span>
                              ) : null}
                              {selection.matchesSubmission ? (
                                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-stone-900">
                                  submission
                                </span>
                              ) : null}
                              <div className="font-mono text-xs text-stone-400">
                                {shortSha(ref.target)}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-stone-500">
                        Load target options to browse refs and commits.
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent commits */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <div className="border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stone-500">
                    Recent commits
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-1 pb-3">
                    {commitOptions?.recentCommits.length ? (
                      commitOptions.recentCommits.map((commit) => {
                        const selection = getRevisionSelectionState(commit.sha);
                        return (
                          <button
                            key={commit.sha}
                            type="button"
                            onClick={() => onApplyPickedRevision(commit.sha)}
                            className={cn(
                              "flex w-full items-start justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left",
                              selection.isSelected
                                ? "border-violet-200 bg-violet-50"
                                : "hover:bg-stone-50",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-stone-900">
                                {commit.summary || "(no summary)"}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                                <span className="font-mono">
                                  {shortSha(commit.sha)}
                                </span>
                                {commit.committedAt ? (
                                  <span>
                                    {formatCommitTimestamp(commit.committedAt)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {selection.matchesBase ? (
                                <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  base
                                </span>
                              ) : null}
                              {selection.matchesSubmission ? (
                                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-stone-900">
                                  submission
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-stone-500">
                        Recent commits appear here after fetch.
                      </div>
                    )}
                  </div>
                </div>

                {/* Picker target segmented control */}
                <div className="xl:col-span-2 flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
                  <span>Picking target:</span>
                  <div className="inline-flex rounded-md border border-stone-200 bg-white p-0.5">
                    <button
                      type="button"
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                        pickerTarget === "base"
                          ? "bg-violet-600 text-white"
                          : "text-stone-500 hover:text-stone-800",
                      )}
                      onClick={() => onPickerTargetChange("base")}
                    >
                      Set base
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                        pickerTarget === "submission"
                          ? "bg-violet-600 text-white"
                          : "text-stone-500 hover:text-stone-800",
                      )}
                      onClick={() => onPickerTargetChange("submission")}
                    >
                      Set submission
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Persistent action footer ── */}
          <footer className="flex flex-wrap items-center gap-2 border-t border-stone-200 bg-stone-50 px-3 py-2">
            <Button
              size="sm"
              variant="default"
              onClick={onOpenReviewWorkspace}
              disabled={busy || !targetReady}
              title={
                !targetReady
                  ? "Set and save a valid target before reviewing the diff"
                  : undefined
              }
            >
              <FileCode className="h-3.5 w-3.5" />
              Review diff
            </Button>
            <Button
              size="sm"
              variant="accent"
              onClick={onPrepareReview}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitPullRequest className="h-3.5 w-3.5" />
              )}
              Prepare PR
            </Button>
            {selectedRepo.prUrl ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void openExternalLink(selectedRepo.prUrl!).catch(() => {});
                }}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Open PR
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void onOpenRepoInEditor()}
              disabled={busy}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open in editor
            </Button>
            <div className="ml-auto">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleMarkReviewedAndNext}
                disabled={busy}
                title={
                  hasNext
                    ? "Mark as reviewed and move to next submission"
                    : "Mark as reviewed"
                }
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {hasNext ? "Mark reviewed & next" : "Mark reviewed"}
              </Button>
            </div>
          </footer>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-white p-6 text-sm text-stone-400">
          Select a submission from the queue to begin grading.
        </div>
      )}
    </section>
  );
}

// ── Feedback tab ──────────────────────────────────────────────────────────────

const MARKDOWN_PROSE =
  "min-h-24 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm" +
  " [&_p]:mb-2 [&_p:last-child]:mb-0" +
  " [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono" +
  " [&_pre]:bg-stone-900 [&_pre]:text-stone-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto" +
  " [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none" +
  " [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-0.5" +
  " [&_a]:text-violet-600 [&_a]:underline [&_strong]:font-semibold" +
  " [&_blockquote]:border-l-[3px] [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-stone-600 [&_blockquote]:italic" +
  " [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1" +
  " [&_table]:border-collapse [&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:border-stone-300 [&_th]:bg-stone-100 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-stone-200 [&_td]:px-2 [&_td]:py-1";

function FeedbackTabContent({
  notesInput,
  onNotesInputChange,
  statusInput,
  onStatusInputChange,
  onSaveRepoMeta,
  busy,
}: {
  notesInput: string;
  onNotesInputChange: (value: string) => void;
  statusInput: string;
  onStatusInputChange: (value: string) => void;
  onSaveRepoMeta: () => void;
  busy: boolean;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  // Track unsaved changes: seed from props on mount, reset after save
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
      {/* Status selector */}
      <label className="block space-y-1.5 text-xs font-medium text-stone-500">
        Review status
        <select
          value={statusInput}
          onChange={(event) => onStatusInputChange(event.currentTarget.value)}
          className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-violet-400"
        >
          <option value="not_started">Not started</option>
          <option value="prepared">Prepared</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </label>

      {/* Feedback editor */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-stone-500">Feedback</span>
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
            onChange={(event) => onNotesInputChange(event.currentTarget.value)}
            rows={12}
            placeholder="Grading feedback, rubric summary, or reminder notes…"
          />
        ) : (
          <div className={MARKDOWN_PROSE}>
            {notesInput.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {notesInput}
              </ReactMarkdown>
            ) : (
              <span className="italic text-stone-400">Nothing to preview.</span>
            )}
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant="secondary"
        onClick={handleSave}
        disabled={busy}
      >
        <NotebookPen className="h-3.5 w-3.5" />
        Save feedback
      </Button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCommitTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}
