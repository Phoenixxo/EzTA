import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCheck,
  FolderOpen,
  GitCompareArrows,
  GitPullRequest,
  LoaderCircle,
  NotebookPen,
} from "lucide-react";
import {
  isGroupSubmission,
  shortSha,
  submissionDisplayName,
  submissionMemberSummary,
} from "../../lib/format";
import { openExternalLink } from "../../lib/ezta";
import { cn } from "../../lib/utils";
import type { CommitOptions, StudentRepo } from "../../types/ezta";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { PanelShell } from "./panel-shell";
import { StatusBadge } from "./status-badge";

type InspectorPaneProps = {
  selectedRepo: StudentRepo | null;
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
  onPrepareReview: () => void;
  onOpenRepoInEditor: () => void;
  onOpenReviewWorkspace: () => void;
  onApplyPickedRevision: (sha: string) => void;
  busy: boolean;
};

const inspectorTabs = ["commits", "notes", "actions", "revisions"] as const;

export function InspectorPane({
  selectedRepo,
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
  onPrepareReview,
  onOpenRepoInEditor,
  onOpenReviewWorkspace,
  onApplyPickedRevision,
  busy,
}: InspectorPaneProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof inspectorTabs)[number]>("commits");

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

  return (
    <PanelShell
      title="Submission Review"
      subtitle={
        selectedRepo
          ? `${selectedPosition}/${filteredRepoCount || 1}`
          : "No repo selected"
      }
      actions={
        selectedRepo ? <StatusBadge status={selectedRepo.reviewStatus} /> : null
      }
      className="h-full min-h-0 min-w-0"
      bodyClassName="grid min-h-0 grid-rows-[auto_auto_1fr]"
    >
      <div className="border-b border-zinc-300 bg-[#f0f0ed] px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {inspectorTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-none px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]",
                activeTab === tab
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-white hover:text-zinc-900",
              )}
            >
              {tab === "revisions"
                ? `revisions ${revisionCount ? `(${revisionCount})` : ""}`
                : tab}
            </button>
          ))}
        </div>
      </div>

      {selectedRepo ? (
        <>
          <div className="border-b border-zinc-300 bg-white px-4 py-3">
            <div className="truncate text-sm font-semibold text-zinc-900">
              {submissionDisplayName(selectedRepo)}
            </div>
            <div className="truncate text-xs text-zinc-500">
              {isGroupSubmission(selectedRepo) ? "Team submission" : "Individual submission"}
            </div>
            <div className="truncate text-xs text-zinc-500">
              {selectedRepo.repoOwner}/{selectedRepo.repoName}
            </div>
            <div className="truncate text-xs text-zinc-500">
              {submissionMemberSummary(selectedRepo)}
            </div>
            <div className="truncate text-xs text-zinc-400">
              {selectedRepo.localPath}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-[#fcfcfb]">
            {activeTab === "commits" ? (
              <div className="space-y-4 p-4">
                {selectedAssignmentDeadline ? (
                  <div className="rounded-none border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                    Deadline:
                    <span className="ml-2 font-medium text-zinc-900">
                      {selectedAssignmentDeadline}
                    </span>
                  </div>
                ) : null}

                {commitOptions?.deadlineSubmissionSha ? (
                  <div className="rounded-none border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    <div className="font-semibold">
                      Suggested submission from GitHub PushEvent
                    </div>
                    <div className="mt-1 break-all font-mono text-xs">
                      {commitOptions.deadlineSubmissionSha}
                    </div>
                    <div className="mt-1 wrap-break-word text-xs text-amber-800">
                      Last push event at or before deadline:
                      <span className="ml-1">
                        {commitOptions.deadlineSubmissionEventAt}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="accent"
                      className="mt-3"
                      onClick={() =>
                        onSubmissionInputChange(
                          commitOptions.deadlineSubmissionSha!,
                        )
                      }
                    >
                      Use deadline submission SHA
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onLoadCommitOptions}
                    disabled={busy}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    Load refs
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
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    Save target
                  </Button>
                </div>

                <div className="grid gap-3 2xl:grid-cols-2">
                  <label className="min-w-0 space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Base SHA
                    <Input
                      value={baseInput}
                      onChange={(event) =>
                        onBaseInputChange(event.currentTarget.value)
                      }
                      placeholder="Base SHA"
                      className="h-9 rounded-none font-mono"
                    />
                  </label>

                  <label className="min-w-0 space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Submission SHA
                    <Input
                      value={submissionInput}
                      onChange={(event) =>
                        onSubmissionInputChange(event.currentTarget.value)
                      }
                      placeholder="Submission SHA"
                      className="h-9 rounded-none font-mono"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {activeTab === "notes" ? (
              <div className="space-y-4 p-4">
                <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Status
                  <select
                    value={statusInput}
                    onChange={(event) =>
                      onStatusInputChange(event.currentTarget.value)
                    }
                    className="h-9 w-full rounded-none border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                  >
                    <option value="not_started">not_started</option>
                    <option value="prepared">prepared</option>
                    <option value="reviewed">reviewed</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Notes
                  <Textarea
                    value={notesInput}
                    onChange={(event) =>
                      onNotesInputChange(event.currentTarget.value)
                    }
                    rows={12}
                    className="rounded-none"
                    placeholder="Inline grading notes, reminders, rubric context"
                  />
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onSaveRepoMeta}
                  disabled={busy}
                >
                  <NotebookPen className="h-3.5 w-3.5" />
                  Save notes/status
                </Button>
              </div>
            ) : null}

            {activeTab === "actions" ? (
              <div className="space-y-4 p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedRepo.prUrl ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-w-0 max-w-full"
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
                    variant="accent"
                    className="min-w-0 max-w-full"
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
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-w-0 max-w-full"
                    onClick={() => void onOpenRepoInEditor()}
                    disabled={busy}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Open in editor
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-w-0 max-w-full"
                    onClick={onOpenReviewWorkspace}
                    disabled={busy}
                  >
                    Review locally
                  </Button>
                </div>
                {selectedRepo.lastError ? (
                  <div className="rounded-none border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {selectedRepo.lastError}
                  </div>
                ) : (
                  <div className="rounded-none border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-600">
                    Use this page to prepare the PR or move into the local
                    review workspace after the commit pair is set.
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "revisions" ? (
              <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4 p-4 xl:grid-cols-2 xl:grid-rows-[minmax(0,1fr)_auto]">
                <div className="flex min-h-0 flex-col overflow-hidden rounded-none border border-zinc-300 bg-white">
                  <div className="border-b border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
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
                              "flex w-full items-center justify-between gap-3 rounded-none border border-transparent px-3 py-2 text-left",
                              selection.isSelected
                                ? "border-zinc-900 bg-zinc-100"
                                : "hover:bg-zinc-50",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-zinc-900">
                                {ref.name}
                              </div>
                              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                {ref.kind}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selection.matchesBase ? (
                                <span className="border border-zinc-900 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                                  base
                                </span>
                              ) : null}
                              {selection.matchesSubmission ? (
                                <span className="border border-amber-500 bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-900">
                                  submission
                                </span>
                              ) : null}
                              <div className="font-mono text-xs text-zinc-500">
                                {shortSha(ref.target)}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-zinc-500">
                        Load refs to browse this repo.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col overflow-hidden rounded-none border border-zinc-300 bg-white">
                  <div className="border-b border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
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
                              "flex w-full items-start justify-between gap-3 rounded-none border border-transparent px-3 py-2 text-left",
                              selection.isSelected
                                ? "border-zinc-900 bg-zinc-100"
                                : "hover:bg-zinc-50",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-zinc-900">
                                {commit.summary || "(no summary)"}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
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
                            <div className="flex items-center gap-2">
                              {selection.matchesBase ? (
                                <span className="border border-zinc-900 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                                  base
                                </span>
                              ) : null}
                              {selection.matchesSubmission ? (
                                <span className="border border-amber-500 bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-900">
                                  submission
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-zinc-500">
                        Recent commits appear here after fetch.
                      </div>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-2 rounded-none border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                  Picker target:
                  <div className="ml-2 inline-flex rounded-none border border-zinc-300 bg-white p-0.5">
                    <button
                      type="button"
                      className={cn(
                        "rounded-none px-2 py-1 font-semibold uppercase tracking-[0.12em]",
                        pickerTarget === "base"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600",
                      )}
                      onClick={() => onPickerTargetChange("base")}
                    >
                      base
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-none px-2 py-1 font-semibold uppercase tracking-[0.12em]",
                        pickerTarget === "submission"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600",
                      )}
                      onClick={() => onPickerTargetChange("submission")}
                    >
                      submission
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex min-h-0 items-center justify-center bg-[#fcfcfb] p-6 text-sm text-zinc-500">
          Select a repository from the queue to inspect SHAs, notes, and review
          actions.
        </div>
      )}
    </PanelShell>
  );
}

function formatCommitTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}
