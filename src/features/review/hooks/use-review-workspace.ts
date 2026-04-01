import { useEffect, useState } from "react";
import {
  createDraftComment,
  deleteDraftComment,
  getReviewFileData,
  listChangedFiles,
  listDraftComments,
  startDiscardPendingReviewJob,
  startPublishDraftCommentsJob,
  startSubmitPendingReviewJob,
  updateDraftComment,
} from "../../../lib/ezta";
import { useBackgroundJobMonitor } from "../../../hooks/use-background-jobs";
import type {
  ChangedFile,
  DraftComment,
  FileContentResult,
  FileDiffResult,
  ReviewFileData,
  SubmitPendingReviewResult,
  StudentRepo,
} from "../../../types/ezta";

export function useReviewWorkspace(selectedRepo: StudentRepo | null, active: boolean) {
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<FileDiffResult | null>(null);
  const [baseContent, setBaseContent] = useState<FileContentResult | null>(null);
  const [submissionContent, setSubmissionContent] = useState<FileContentResult | null>(null);
  const [fileCache, setFileCache] = useState<
    Record<
      string,
      {
        reviewFileData: ReviewFileData;
      }
    >
  >({});
  const [draftComments, setDraftComments] = useState<DraftComment[]>([]);
  const [draftBody, setDraftBody] = useState("");
  const [draftStartLine, setDraftStartLine] = useState("1");
  const [draftEndLine, setDraftEndLine] = useState("1");
  const [draftSide, setDraftSide] = useState("submission");
  const [reviewSubmissionBody, setReviewSubmissionBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [publishJobId, setPublishJobId] = useState<number | null>(null);
  const [submitJobId, setSubmitJobId] = useState<number | null>(null);
  const [discardJobId, setDiscardJobId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedRepo || !active) {
      setChangedFiles([]);
      setSelectedPath(null);
      setDiffResult(null);
      setBaseContent(null);
      setSubmissionContent(null);
      setFileCache({});
      setDraftComments([]);
      setDraftBody("");
      setDraftStartLine("1");
      setDraftEndLine("1");
      setDraftSide("submission");
      setReviewSubmissionBody("");
      setError("");
      return;
    }
    void loadWorkspace(selectedRepo.id);
  }, [selectedRepo, active]);

  useEffect(() => {
    if (!selectedRepo || !active || !selectedPath) {
      return;
    }
    const cached = fileCache[selectedPath];
    if (cached) {
      setDiffResult({ path: cached.reviewFileData.path, diff: cached.reviewFileData.diff });
      setBaseContent(
        cached.reviewFileData.baseContent === null
          ? null
          : {
              path: cached.reviewFileData.path,
              side: "base",
              content: cached.reviewFileData.baseContent,
            },
      );
      setSubmissionContent(
        cached.reviewFileData.submissionContent === null
          ? null
          : {
              path: cached.reviewFileData.path,
              side: "submission",
              content: cached.reviewFileData.submissionContent,
            },
      );
      setDraftStartLine("1");
      setDraftEndLine("1");
      return;
    }
    void loadFileState(selectedRepo.id, selectedPath);
  }, [selectedRepo, active, selectedPath, fileCache]);

  useBackgroundJobMonitor<{ comments?: DraftComment[] } | null>({
    jobId: publishJobId,
    onCleanup: () => {
      setPublishJobId(null);
      setBusy(false);
    },
    onFailed: (job) => {
      setError(job.error ?? "Publish job failed.");
    },
    onSettled: async (_, result) => {
      if (result?.comments) {
        setDraftComments(result.comments);
      }
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  useBackgroundJobMonitor<SubmitPendingReviewResult | null>({
    jobId: submitJobId,
    onCleanup: () => {
      setSubmitJobId(null);
      setBusy(false);
    },
    onFailed: (job) => {
      setError(job.error ?? "Submit review job failed.");
    },
    onSettled: async (_, result) => {
      if (result?.comments) {
        setDraftComments(result.comments);
      }
      setReviewSubmissionBody("");
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  useBackgroundJobMonitor<DraftComment[] | null>({
    jobId: discardJobId,
    onCleanup: () => {
      setDiscardJobId(null);
      setBusy(false);
    },
    onFailed: (job) => {
      setError(job.error ?? "Discard review job failed.");
    },
    onSettled: async (_, comments) => {
      if (comments) {
        setDraftComments(comments);
      }
      setReviewSubmissionBody("");
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  async function loadWorkspace(studentRepoId: number) {
    setBusy(true);
    setError("");
    try {
      const [files, comments] = await Promise.all([
        listChangedFiles(studentRepoId),
        listDraftComments(studentRepoId),
      ]);
      setChangedFiles(files);
      setDraftComments(comments);
      setSelectedPath((current) => current ?? files[0]?.path ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadFileState(studentRepoId: number, path: string) {
    setBusy(true);
    setError("");
    try {
      const reviewFileData = await getReviewFileData({ studentRepoId, path });
      setDiffResult({ path: reviewFileData.path, diff: reviewFileData.diff });
      setBaseContent(
        reviewFileData.baseContent === null
          ? null
          : {
              path: reviewFileData.path,
              side: "base",
              content: reviewFileData.baseContent,
            },
      );
      setSubmissionContent(
        reviewFileData.submissionContent === null
          ? null
          : {
              path: reviewFileData.path,
              side: "submission",
              content: reviewFileData.submissionContent,
            },
      );
      setFileCache((current) => ({
        ...current,
        [path]: {
          reviewFileData,
        },
      }));
      setDraftStartLine("1");
      setDraftEndLine("1");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function createComment() {
    if (!selectedRepo || !selectedPath || !draftBody.trim()) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const startLine = Number(draftStartLine) || 1;
      const endLine = Number(draftEndLine) || startLine;
      const created = await createDraftComment({
        studentRepoId: selectedRepo.id,
        filePath: selectedPath,
        startLine: Math.min(startLine, endLine),
        lineNumber: Math.max(startLine, endLine),
        side: draftSide,
        body: draftBody.trim(),
        codeContext: null,
      });
      setDraftComments((current) => [created, ...current]);
      setDraftBody("");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function updateComment(
    commentId: number,
    input: { body: string; startLine: number; lineNumber: number; side: string },
  ) {
    setBusy(true);
    setError("");
    try {
      const updated = await updateDraftComment({
        commentId,
        body: input.body,
        startLine: input.startLine,
        lineNumber: input.lineNumber,
        side: input.side,
      });
      setDraftComments((current) =>
        current.map((comment) => (comment.id === commentId ? updated : comment)),
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(commentId: number) {
    setBusy(true);
    setError("");
    try {
      await deleteDraftComment(commentId);
      setDraftComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function publishComments() {
    if (!selectedRepo) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const job = await startPublishDraftCommentsJob(selectedRepo.id);
      setPublishJobId(job.id);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  async function submitQueuedReview() {
    if (!selectedRepo) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const job = await startSubmitPendingReviewJob({
        studentRepoId: selectedRepo.id,
        event: "COMMENT",
        body: reviewSubmissionBody,
      });
      setSubmitJobId(job.id);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  async function discardQueuedReview() {
    if (!selectedRepo) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const job = await startDiscardPendingReviewJob(selectedRepo.id);
      setDiscardJobId(job.id);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return {
    changedFiles,
    selectedPath,
    setSelectedPath,
    diffResult,
    baseContent,
    submissionContent,
    draftComments,
    draftBody,
    setDraftBody,
    draftStartLine,
    setDraftStartLine,
    draftEndLine,
    setDraftEndLine,
    draftSide,
    setDraftSide,
    reviewSubmissionBody,
    setReviewSubmissionBody,
    busy,
    error,
    createComment,
    updateComment,
    removeComment,
    publishComments,
    submitQueuedReview,
    discardQueuedReview,
  };
}
