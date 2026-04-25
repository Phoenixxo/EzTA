import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  GitCompareArrows,
  MessageSquarePlus,
  Search,
  Send,
} from "lucide-react";
import { submissionDisplayName, submissionMemberSummary } from "../../../lib/format";
import { cn } from "../../../lib/utils";
import type {
  DraftComment,
  StudentRepo,
  SubmissionKind,
} from "../../../types/ezta";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { PanelShell } from "../../../components/workspace/panel-shell";
import { StatusBadge } from "../../../components/workspace/status-badge";
import { useReviewWorkspace } from "../hooks/use-review-workspace";
import { openExternalLink, openFileInEditor, openRepoInEditor } from "../../../lib/ezta";
import { DraftCommentRow } from "./draft-comment-row";
import { StructuredDiffPane } from "./structured-diff-pane";
import { basename, dirname, groupChangedFiles, lineToneClass } from "../lib/diff-view";

type ReviewWorkspaceProps = {
  selectedRepo: StudentRepo | null;
  assignmentSubmissionKind: SubmissionKind | null;
  editorCommand: string;
  onBack: () => void;
};

export function ReviewWorkspace({
  selectedRepo,
  assignmentSubmissionKind,
  editorCommand,
  onBack,
}: ReviewWorkspaceProps) {
  const [viewMode, setViewMode] = useState<"diff" | "source">("diff");
  const [sourceSide, setSourceSide] = useState<"base" | "submission">("submission");
  const [editorError, setEditorError] = useState("");
  const [fileQuery, setFileQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const review = useReviewWorkspace(selectedRepo, Boolean(selectedRepo));
  const currentComments = review.draftComments.filter(
    (comment) => comment.filePath === review.selectedPath,
  );
  const baseComments = currentComments.filter((comment) => comment.side === "base");
  const submissionComments = currentComments.filter(
    (comment) => comment.side === "submission",
  );
  const unpublishedCount = review.draftComments.filter(
    (comment) =>
      comment.publishStatus === "draft" || comment.publishStatus === "failed_to_map",
  ).length;
  const queuedComments = review.draftComments.filter(
    (comment) => comment.publishStatus === "queued_for_review",
  );
  const pendingReview = queuedComments[0] ?? null;
  const visibleFiles = useMemo(() => {
    const query = fileQuery.trim().toLowerCase();
    return review.changedFiles.filter((file) => {
      if (!query) {
        return true;
      }
      return [file.path, file.previousPath ?? "", file.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [fileQuery, review.changedFiles]);
  const groupedFiles = useMemo(() => groupChangedFiles(visibleFiles), [visibleFiles]);
  const forceExpanded = fileQuery.trim().length > 0;

  useEffect(() => {
    if (!review.selectedPath) {
      return;
    }
    const group = dirname(review.selectedPath);
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.delete(group)) {
        return next;
      }
      return current;
    });
  }, [review.selectedPath]);

  function toggleGroup(label: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  if (!selectedRepo) {
    return (
      <div className="rounded-none border border-zinc-300 bg-white px-6 py-8 text-sm text-zinc-500">
        Select a submission to enter review mode.
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] min-h-0 gap-4 xl:grid-cols-[280px_minmax(0,1.3fr)_380px]">
      <PanelShell
        title="Changed Files"
        subtitle={`${review.changedFiles.length} files`}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        }
        className="h-full min-h-0"
      >
        <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_1fr] bg-white">
          <div className="border-b border-zinc-200 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={fileQuery}
                onChange={(event) => setFileQuery(event.currentTarget.value)}
                placeholder="Search changed files"
                className="h-9 rounded-none pl-8"
              />
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto bg-white p-2">
            {groupedFiles.map((group) => {
              const isCollapsed = !forceExpanded && collapsedGroups.has(group.label);

              return (
                <div key={group.label} className="mb-3">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="mb-1 flex w-full items-center gap-1 border-b border-zinc-200 px-1 pb-1 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 hover:bg-zinc-50"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{group.label}</span>
                  </button>
                  {!isCollapsed ? (
                    <div className="space-y-1">
                      {group.files.map((file) => (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => review.setSelectedPath(file.path)}
                          className={`w-full rounded-none border px-3 py-2 text-left ${
                            review.selectedPath === file.path
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white hover:border-zinc-400"
                          }`}
                        >
                          <div className="truncate text-sm font-medium">{basename(file.path)}</div>
                          <div className="truncate text-[11px] opacity-70">{file.path}</div>
                          <div className="truncate text-[11px] opacity-70">
                            {file.status}
                            {file.previousPath ? ` from ${file.previousPath}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {visibleFiles.length === 0 ? (
              <div className="border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500">
                No changed files match the current search.
              </div>
            ) : null}
          </div>
        </div>
      </PanelShell>

      <PanelShell
        title={review.selectedPath ?? "File viewer"}
        subtitle={`${submissionDisplayName(
          selectedRepo,
          assignmentSubmissionKind,
        )} · ${selectedRepo.repoName}`}
        actions={
          <div className="flex items-center gap-2">
            {selectedRepo.prUrl ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditorError("");
                  void openExternalLink(selectedRepo.prUrl!).catch((err) =>
                    setEditorError(String(err)),
                  );
                }}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Open PR
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditorError("");
                void openRepoInEditor({
                  studentRepoId: selectedRepo.id,
                  editorCommand,
                }).catch((err) => setEditorError(String(err)));
              }}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open repo
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!review.selectedPath}
              onClick={() => {
                if (!review.selectedPath) {
                  return;
                }
                setEditorError("");
                void openFileInEditor({
                  studentRepoId: selectedRepo.id,
                  filePath: review.selectedPath,
                  editorCommand,
                }).catch((err) => setEditorError(String(err)));
              }}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open file
            </Button>
          </div>
        }
        className="h-full min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500">
            <StatusBadge status={selectedRepo.reviewStatus} />
            <span className="truncate">{submissionMemberSummary(selectedRepo)}</span>
            {review.busy ? <span>Loading review data...</span> : null}
            {review.error ? <span className="text-red-600">{review.error}</span> : null}
            {editorError ? <span className="text-red-600">{editorError}</span> : null}
          </div>
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex border border-zinc-300 bg-white">
                <Button
                  size="sm"
                  variant={viewMode === "diff" ? "default" : "ghost"}
                  className="border-r border-zinc-300"
                  onClick={() => setViewMode("diff")}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  Diff
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "source" ? "default" : "ghost"}
                  onClick={() => setViewMode("source")}
                >
                  Source
                </Button>
              </div>
              <div className="inline-flex border border-zinc-300 bg-white">
                <Button
                  size="sm"
                  variant={viewMode === "source" && sourceSide === "base" ? "default" : "ghost"}
                  className="border-r border-zinc-300"
                  onClick={() => setSourceSide("base")}
                  disabled={viewMode !== "source"}
                >
                  Base
                </Button>
                <Button
                  size="sm"
                  variant={
                    viewMode === "source" && sourceSide === "submission"
                      ? "default"
                      : "ghost"
                  }
                  onClick={() => setSourceSide("submission")}
                  disabled={viewMode !== "source"}
                >
                  Submission
                </Button>
              </div>
            </div>
          </div>
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
              }}
            />
          ) : (
            <div
              className={cn(
                "min-h-0 flex-1 overflow-auto",
                sourceSide === "base" ? "bg-[#fbfbfa]" : "bg-white",
              )}
            >
              <div className="border-b border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {sourceSide}
              </div>
              <SelectableCodePane
                side={sourceSide}
                content={
                  sourceSide === "base"
                    ? (review.baseContent?.content ?? "")
                    : (review.submissionContent?.content ?? "")
                }
                comments={sourceSide === "base" ? baseComments : submissionComments}
                selectedStartLine={
                  review.draftSide === sourceSide ? Number(review.draftStartLine) || 1 : null
                }
                selectedEndLine={
                  review.draftSide === sourceSide ? Number(review.draftEndLine) || 1 : null
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
                }}
              />
            </div>
          )}
        </div>
      </PanelShell>

      <PanelShell
        title="Draft Comments"
        subtitle={review.selectedPath ?? "No file selected"}
        actions={
          pendingReview?.githubReviewUrl ? (
            <a
              href={pendingReview.githubReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700"
            >
              <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
              Open pending review
            </a>
          ) : null
        }
        className="h-full min-h-0"
      >
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] bg-[#fbfbfa]">
          <div className="border-b border-zinc-300 px-3 py-3">
            <div className="space-y-2">
              <div className="grid min-w-0 gap-2 md:grid-cols-[100px_100px_minmax(0,1fr)]">
                <Input
                  value={review.draftStartLine}
                  onChange={(event) => review.setDraftStartLine(event.currentTarget.value)}
                  placeholder="Start"
                  className="h-9 min-w-0 rounded-none"
                />
                <Input
                  value={review.draftEndLine}
                  onChange={(event) => review.setDraftEndLine(event.currentTarget.value)}
                  placeholder="End"
                  className="h-9 min-w-0 rounded-none"
                />
                <select
                  value={review.draftSide}
                  onChange={(event) => review.setDraftSide(event.currentTarget.value)}
                  className="h-9 min-w-0 rounded-none border border-zinc-300 bg-white px-3 text-sm"
                >
                  <option value="submission">submission</option>
                  <option value="base">base</option>
                </select>
              </div>
              <Textarea
                value={review.draftBody}
                onChange={(event) => review.setDraftBody(event.currentTarget.value)}
                rows={5}
                className="rounded-none"
                placeholder="Add a local draft comment for this file and line range"
              />
              <Button
                type="button"
                size="sm"
                variant="accent"
                onClick={() => void review.createComment()}
                disabled={!review.selectedPath || !review.draftBody.trim()}
                className="w-full"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Save draft comment
              </Button>
              {!selectedRepo.prNumber ? (
                <div className="border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600">
                  Prepare the PR before publishing drafts to GitHub.
                </div>
              ) : null}
              {pendingReview ? (
                <div className="space-y-2 border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950">
                  <div className="font-semibold uppercase tracking-[0.12em]">
                    Pending review queued
                  </div>
                  <div>
                    {queuedComments.length} comment{queuedComments.length === 1 ? "" : "s"} are attached to one pending GitHub review.
                  </div>
                  <Textarea
                    value={review.reviewSubmissionBody}
                    onChange={(event) =>
                      review.setReviewSubmissionBody(event.currentTarget.value)
                    }
                    rows={3}
                    className="rounded-none"
                    placeholder="Optional overall review summary comment"
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="accent"
                      onClick={() => void review.submitQueuedReview()}
                      disabled={review.busy}
                      className="min-w-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit comment review
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void review.discardQueuedReview()}
                      disabled={review.busy}
                      className="min-w-0"
                    >
                      Discard pending review
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="accent"
                  onClick={() => void review.publishComments()}
                  disabled={!selectedRepo.prNumber || unpublishedCount === 0 || review.busy}
                  className="w-full"
                >
                  <Send className="h-3.5 w-3.5" />
                  Queue pending review
                </Button>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-2">
            {currentComments.length === 0 ? (
              <div className="rounded-none border border-dashed border-zinc-300 bg-white px-3 py-4 text-sm text-zinc-500">
                No draft comments for this file yet.
              </div>
            ) : null}
            <div className="space-y-2">
              {currentComments.map((comment) => (
                <DraftCommentRow
                  key={comment.id}
                  onDelete={() => void review.removeComment(comment.id)}
                  onSave={(input) => void review.updateComment(comment.id, input)}
                  comment={comment}
                  locked={comment.publishStatus === "queued_for_review"}
                />
              ))}
            </div>
          </div>
        </div>
      </PanelShell>
    </div>
  );
}

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
    if (!dragging) {
      return;
    }
    function handleMouseUp() {
      setDragging(false);
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragging]);

  if (!content) {
    return <div className="p-4 text-xs text-zinc-500">{emptyMessage}</div>;
  }

  const lines = content.split("\n");
  const activeStart = dragging ? dragStartLine : selectedStartLine;
  const activeEnd = dragging ? dragEndLine : selectedEndLine;

  return (
    <div className="min-h-0 overflow-auto bg-inherit">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
        Drag across lines to target {side} comment ranges.
      </div>
      <div className="font-mono text-xs leading-5 text-zinc-800 select-none">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isSelected =
            activeStart !== null &&
            activeEnd !== null &&
            lineNumber >= Math.min(activeStart, activeEnd) &&
            lineNumber <= Math.max(activeStart, activeEnd);
          const matchingComments = comments.filter(
            (comment) =>
              lineNumber >= comment.startLine && lineNumber <= comment.lineNumber,
          );
          const toneClass = lineToneClass(matchingComments, isSelected);

          return (
            <div
              key={`${side}-${lineNumber}`}
              className={cn(
                "grid grid-cols-[4rem_minmax(0,1fr)] border-b border-zinc-100",
                toneClass,
              )}
              onMouseDown={() => {
                setDragging(true);
                setDragStartLine(lineNumber);
                setDragEndLine(lineNumber);
                onSelectionChange(lineNumber, lineNumber);
              }}
              onMouseEnter={() => {
                if (!dragging || dragStartLine === null) {
                  return;
                }
                setDragEndLine(lineNumber);
                onSelectionChange(dragStartLine, lineNumber);
              }}
            >
              <div className="border-r border-zinc-200 px-2 py-0.5 text-right text-[11px] text-zinc-500">
                {lineNumber}
              </div>
              <div className="flex min-w-0 items-start justify-between gap-3 px-3 py-0.5">
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">
                  {line || " "}
                </span>
                {matchingComments.length > 0 ? (
                  <span className="shrink-0 border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    {matchingComments.length} comment{matchingComments.length > 1 ? "s" : ""}
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
