import { useEffect, useMemo, useState } from "react";
import {
  createAssignment,
  createStudentRepo,
  deleteAssignment,
  importClassroomRoster,
  listAssignments,
  listCommitOptions,
  listStudentRepos,
  openRepoInEditor,
  openExternalLink,
  saveReviewTarget,
  startPrepareReviewJob,
  startSyncAssignmentReposJob,
  updateAssignment,
  updateStudentRepo,
  validateReviewTarget,
} from "../lib/ezta";
import { useBackgroundJobMonitor } from "./use-background-jobs";
import {
  readStoredEditorPreference,
  readStoredWorkspaceSelection,
  syncEditorPreferenceFromStorageEvent,
  writeStoredEditorPreference,
  writeStoredQueueControls,
  writeStoredSelectedAssignmentId,
  writeStoredSelectedRepoId,
} from "../lib/ezta-storage";
import { utcIsoToLocalDateTimeInput } from "../lib/format";
import { filterAndSortRepos } from "../lib/queue";
import type {
  Assignment,
  AssignmentForm,
  CommitOptions,
  EditorPreference,
  QueueSort,
  RepoForm,
  ReviewStatusFilter,
  StudentRepo,
} from "../types/ezta";

export function useEztaWorkspace() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [repos, setRepos] = useState<StudentRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [commitOptions, setCommitOptions] = useState<CommitOptions | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"base" | "submission">("base");
  const [baseInput, setBaseInput] = useState("");
  const [submissionInput, setSubmissionInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [submissionKindInput, setSubmissionKindInput] = useState<"individual" | "group">(
    "individual",
  );
  const [repoTemplateInput, setRepoTemplateInput] = useState("");
  const [editorAppInput, setEditorAppInput] = useState<EditorPreference>("system");
  const [editorApplicationPathInput, setEditorApplicationPathInput] = useState("");
  const [editorPreferenceLoaded, setEditorPreferenceLoaded] = useState(false);
  const [rosterInput, setRosterInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [statusInput, setStatusInput] = useState("not_started");
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [repoQuery, setRepoQuery] = useState("");
  const [queueSort, setQueueSort] = useState<QueueSort>("student");
  const [message, setMessage] = useState("Loading assignments...");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncJobId, setSyncJobId] = useState<number | null>(null);
  const [syncJobAssignmentId, setSyncJobAssignmentId] = useState<number | null>(null);
  const [prepareJobId, setPrepareJobId] = useState<number | null>(null);
  const [prepareJobAssignmentId, setPrepareJobAssignmentId] = useState<number | null>(null);

  const selectedAssignment =
    assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;
  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) ?? null;

  const filteredRepos = useMemo(
    () =>
      filterAndSortRepos(
        repos,
        statusFilter,
        repoQuery,
        queueSort,
        selectedAssignment?.submissionKind ?? null,
      ),
    [queueSort, repoQuery, repos, selectedAssignment?.submissionKind, statusFilter],
  );

  const resolvedEditorApplication = useMemo(
    () =>
      editorAppInput === "application" ? editorApplicationPathInput.trim() : "",
    [editorAppInput, editorApplicationPathInput],
  );

  useEffect(() => {
    void loadAssignments();
  }, []);

  useEffect(() => {
    const { app, applicationPath } = readStoredEditorPreference();
    const storedWorkspaceSelection = readStoredWorkspaceSelection();
    if (app) {
      setEditorAppInput(app);
    }
    setEditorApplicationPathInput(applicationPath);
    setEditorPreferenceLoaded(true);
    if (storedWorkspaceSelection.assignmentId) {
      setSelectedAssignmentId(storedWorkspaceSelection.assignmentId);
    }
    if (storedWorkspaceSelection.repoId) {
      setSelectedRepoId(storedWorkspaceSelection.repoId);
    }
    if (storedWorkspaceSelection.statusFilter) {
      setStatusFilter(storedWorkspaceSelection.statusFilter);
    }
    if (storedWorkspaceSelection.repoQuery) {
      setRepoQuery(storedWorkspaceSelection.repoQuery);
    }
    if (storedWorkspaceSelection.queueSort) {
      setQueueSort(storedWorkspaceSelection.queueSort);
    }
  }, []);

  useEffect(() => {
    if (!editorPreferenceLoaded) {
      return;
    }
    writeStoredEditorPreference(editorAppInput, editorApplicationPathInput);
  }, [editorAppInput, editorApplicationPathInput, editorPreferenceLoaded]);

  useEffect(() => {
    writeStoredSelectedAssignmentId(selectedAssignmentId);
  }, [selectedAssignmentId]);

  useEffect(() => {
    writeStoredSelectedRepoId(selectedRepoId);
  }, [selectedRepoId]);

  useEffect(() => {
    writeStoredQueueControls(statusFilter, repoQuery, queueSort);
  }, [queueSort, repoQuery, statusFilter]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      syncEditorPreferenceFromStorageEvent(event, {
        setEditorAppInput,
        setEditorApplicationPathInput,
      });
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setRepos([]);
      setSelectedRepoId(null);
      return;
    }
    void loadRepos(selectedAssignmentId);
  }, [selectedAssignmentId]);

  useEffect(() => {
    setDeadlineInput(utcIsoToLocalDateTimeInput(selectedAssignment?.deadlineAt ?? null));
    setSubmissionKindInput(selectedAssignment?.submissionKind ?? "individual");
    setRepoTemplateInput(selectedAssignment?.repoTemplate ?? "");
  }, [selectedAssignment]);

  useEffect(() => {
    if (!selectedRepo) {
      setBaseInput("");
      setSubmissionInput("");
      setNotesInput("");
      setStatusInput("not_started");
      setCommitOptions(null);
      return;
    }
    setCommitOptions(null);
    setPickerTarget("base");
    setBaseInput(selectedRepo.baseSha ?? "");
    setSubmissionInput(selectedRepo.submissionSha ?? "");
    setNotesInput(selectedRepo.notes);
    setStatusInput(selectedRepo.reviewStatus);
  }, [selectedRepo]);

  useBackgroundJobMonitor<{
    importedCount: number;
    missingCount: number;
    totalCount: number;
  } | null>({
    jobId: syncJobId,
    onCleanup: () => {
      setSyncJobId(null);
      setSyncJobAssignmentId(null);
    },
    onFailed: (job) => {
      setError(job.error ?? "Sync job failed.");
    },
    onSettled: async (_, result) => {
      if (!syncJobAssignmentId) {
        return;
      }
      await loadRepos(syncJobAssignmentId);
      if (result) {
        setMessage(
          `Resolved ${result.importedCount} repos, ${result.missingCount} missing. Queue now has ${result.totalCount}.`,
        );
      } else {
        setMessage("Repository sync completed.");
      }
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  useBackgroundJobMonitor<{ prUrl?: string } | null>({
    jobId: prepareJobId,
    onCleanup: () => {
      setPrepareJobId(null);
      setPrepareJobAssignmentId(null);
    },
    onFailed: (job) => {
      setError(job.error ?? "Prepare review job failed.");
    },
    onSettled: async (_, result) => {
      if (!prepareJobAssignmentId) {
        return;
      }
      await loadRepos(prepareJobAssignmentId);
      if (result?.prUrl) {
        setMessage(`Prepared review PR: ${result.prUrl}`);
        void openExternalLink(result.prUrl).catch((err) => {
          setError(String(err));
        });
      } else {
        setMessage("Prepared review PR.");
      }
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  async function loadAssignments() {
    setBusy(true);
    setError("");
    try {
      const loaded = await listAssignments();
      setAssignments(loaded);
      setSelectedAssignmentId((current) => current ?? loaded[0]?.id ?? null);
      setMessage(loaded.length ? "Assignments loaded." : "Create an assignment to start.");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadRepos(assignmentId: number) {
    setBusy(true);
    setError("");
    try {
      const loaded = await listStudentRepos(assignmentId);
      setRepos(loaded);
      setSelectedRepoId((current) => {
        if (loaded.some((repo) => repo.id === current)) {
          return current;
        }
        return loaded[0]?.id ?? null;
      });
      setMessage(loaded.length ? "Repository queue loaded." : "No repositories yet for this assignment.");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  function replaceRepo(updated: StudentRepo) {
    setRepos((current) =>
      current
        .map((repo) => (repo.id === updated.id ? updated : repo))
        .sort((a, b) => a.repoName.localeCompare(b.repoName)),
    );
    setSelectedRepoId(updated.id);
  }

  async function handleCreateAssignment(form: AssignmentForm) {
    setBusy(true);
    setError("");
    try {
      const created = await createAssignment(form);
      setAssignments((current) => [created, ...current]);
      setSelectedAssignmentId(created.id);
      setMessage(`Created assignment ${created.name}.`);
      return created;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncAssignment() {
    if (!selectedAssignmentId) return;
    setError("");
    setMessage("Queued assignment repository sync...");
    try {
      const job = await startSyncAssignmentReposJob(selectedAssignmentId);
      setSyncJobId(job.id);
      setSyncJobAssignmentId(selectedAssignmentId);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleUpdateAssignmentDeadline() {
    if (!selectedAssignmentId) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateAssignment({
        assignmentId: selectedAssignmentId,
        deadlineAt: deadlineInput,
        submissionKind: submissionKindInput,
        repoTemplate: repoTemplateInput,
      });
      setAssignments((current) =>
        current.map((assignment) => (assignment.id === updated.id ? updated : assignment)),
      );
      setMessage(`Saved assignment settings for ${updated.name}.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAssignment(
    deleteLocalWorkspace = false,
    assignmentIdOverride?: number,
  ) {
    const deletedId = assignmentIdOverride ?? selectedAssignmentId;
    if (!deletedId) return;
    setBusy(true);
    setError("");
    try {
      await deleteAssignment({
        assignmentId: deletedId,
        deleteLocalWorkspace,
      });
      setSelectedAssignmentId(null);
      setAssignments((current) => current.filter((assignment) => assignment.id !== deletedId));
      setRepos([]);
      setSelectedRepoId(null);
      setCommitOptions(null);
      const loaded = await listAssignments();
      setAssignments(loaded);
      setSelectedAssignmentId(loaded[0]?.id ?? null);
      setMessage(
        deleteLocalWorkspace
          ? "Deleted assignment and local workspace."
          : "Deleted assignment queue.",
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleImportRoster() {
    if (!selectedAssignmentId) return;
    setBusy(true);
    setError("");
    setMessage("Importing classroom roster...");
    try {
      const result = await importClassroomRoster({
        assignmentId: selectedAssignmentId,
        csvContent: rosterInput,
      });
      await loadRepos(selectedAssignmentId);
      setMessage(
        `Imported ${result.importedCount} roster rows, skipped ${result.skippedCount}. Queue now has ${result.totalCount}.`,
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddRepo(form: RepoForm) {
    if (!selectedAssignmentId) return;
    setBusy(true);
    setError("");
    try {
      const created = await createStudentRepo({
        ...form,
        assignmentId: selectedAssignmentId,
      });
      await loadRepos(selectedAssignmentId);
      setSelectedRepoId(created.id);
      setMessage(`Saved ${created.repoName}.`);
      return created;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveRepoMeta() {
    if (!selectedRepo) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateStudentRepo({
        studentRepoId: selectedRepo.id,
        notes: notesInput,
        reviewStatus: statusInput,
      });
      replaceRepo(updated);
      setMessage(`Updated ${updated.repoName}.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadCommitOptions() {
    if (!selectedRepo) return;
    setBusy(true);
    setError("");
    try {
      const loaded = await listCommitOptions(selectedRepo.id);
      setCommitOptions(loaded);
      setMessage(`Fetched refs and recent commits for ${selectedRepo.repoName}.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleValidateTarget() {
    if (!selectedRepo) return;
    setBusy(true);
    setError("");
    try {
      const result = await validateReviewTarget({
        studentRepoId: selectedRepo.id,
        baseSha: baseInput,
        submissionSha: submissionInput,
      });
      setMessage(
        `Base ${result.baseExists ? "found" : "missing"}; submission ${
          result.submissionExists ? "found" : "missing"
        }.`,
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTarget() {
    if (!selectedRepo) return;
    setBusy(true);
    setError("");
    try {
      const updated = await saveReviewTarget({
        studentRepoId: selectedRepo.id,
        baseSha: baseInput,
        submissionSha: submissionInput,
        baseLabel: baseInput,
        submissionLabel: submissionInput,
      });
      replaceRepo(updated);
      setMessage(`Saved review target for ${updated.repoName}.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePrepareReview() {
    if (!selectedRepo) return;
    setError("");
    try {
      const job = await startPrepareReviewJob(selectedRepo.id);
      setPrepareJobId(job.id);
      setPrepareJobAssignmentId(selectedRepo.assignmentId);
      setMessage("Queued PR preparation...");
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleOpenRepoInEditor(studentRepoIdOverride?: number) {
    const repoId =
      typeof studentRepoIdOverride === "number"
        ? studentRepoIdOverride
        : selectedRepo?.id;
    if (!repoId) return;
    setBusy(true);
    setError("");
    try {
      await openRepoInEditor({
        studentRepoId: repoId,
        editorCommand: resolvedEditorApplication,
      });
      setMessage("Opened repository in editor.");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleOpenPr() {
    if (!selectedRepo?.prUrl) {
      return;
    }
    void openExternalLink(selectedRepo.prUrl).catch((err) => {
      setError(String(err));
    });
  }

  async function handleMarkReviewed() {
    if (!selectedRepo) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateStudentRepo({
        studentRepoId: selectedRepo.id,
        notes: notesInput,
        reviewStatus: "reviewed",
      });
      replaceRepo(updated);
      setStatusInput("reviewed");
      setMessage(`Marked ${updated.repoName} as reviewed.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  function applyPickedRevision(sha: string) {
    if (pickerTarget === "base") {
      setBaseInput(sha);
      return;
    }
    setSubmissionInput(sha);
  }

  return {
    assignments,
    selectedAssignment,
    selectedAssignmentId,
    setSelectedAssignmentId,
    repos,
    filteredRepos,
    selectedRepo,
    selectedRepoId,
    setSelectedRepoId,
    commitOptions,
    pickerTarget,
    setPickerTarget,
    baseInput,
    setBaseInput,
    submissionInput,
    setSubmissionInput,
    deadlineInput,
    setDeadlineInput,
    submissionKindInput,
    setSubmissionKindInput,
    repoTemplateInput,
    setRepoTemplateInput,
    resolvedEditorApplication,
    rosterInput,
    setRosterInput,
    notesInput,
    setNotesInput,
    statusInput,
    setStatusInput,
    statusFilter,
    setStatusFilter,
    repoQuery,
    setRepoQuery,
    queueSort,
    setQueueSort,
    message,
    error,
    busy,
    handleCreateAssignment,
    handleSyncAssignment,
    handleUpdateAssignmentDeadline,
    handleDeleteAssignment,
    handleImportRoster,
    handleAddRepo,
    handleSaveRepoMeta,
    handleLoadCommitOptions,
    handleValidateTarget,
    handleSaveTarget,
    handlePrepareReview,
    handleOpenRepoInEditor,
    handleOpenPr,
    handleMarkReviewed,
    applyPickedRevision,
  };
}
