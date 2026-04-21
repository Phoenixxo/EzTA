import { invoke } from "@tauri-apps/api/core";
import { localDateTimeInputToUtcIso } from "./format";
import type {
  Assignment,
  BackgroundJob,
  AppUpdateCheckResult,
  AppUpdateInstallResult,
  AppUpdaterOverview,
  AssignmentDiscoveryGroup,
  AssignmentDiscoveryRepo,
  AssignmentForm,
  ChangedFile,
  CommitOptions,
  DraftComment,
  FileContentResult,
  FileDiffResult,
  GithubConnectionStatus,
  LocalDataSnapshot,
  OrgRepoIndexStatus,
  PublishDraftCommentsResult,
  RepoForm,
  ReviewFileData,
  ReviewSubmissionEvent,
  SubmitPendingReviewResult,
  StudentRepo,
} from "../types/ezta";

export async function listAssignments() {
  return invoke<Assignment[]>("list_assignments");
}

export async function getGithubConnectionStatus() {
  return invoke<GithubConnectionStatus>("get_github_connection_status");
}

export async function getAppUpdaterOverview() {
  return invoke<AppUpdaterOverview>("get_app_updater_overview");
}

export async function checkForAppUpdate() {
  return invoke<AppUpdateCheckResult>("check_for_app_update");
}

export async function installAppUpdate() {
  return invoke<AppUpdateInstallResult>("install_app_update");
}

export async function launchGithubAuth() {
  return invoke<void>("launch_github_auth");
}

export async function refreshOrgRepoIndex(githubOrg: string) {
  return invoke<OrgRepoIndexStatus>("refresh_org_repo_index", {
    input: {
      githubOrg,
    },
  });
}

export async function startRefreshOrgRepoIndexJob(githubOrg: string) {
  return invoke<BackgroundJob>("start_refresh_org_repo_index_job", {
    input: {
      githubOrg,
    },
  });
}

export async function discoverAssignmentGroups(githubOrg: string) {
  return invoke<AssignmentDiscoveryGroup[]>("discover_assignment_candidates", {
    input: {
      githubOrg,
    },
  });
}

export async function listAssignmentGroupRepos(githubOrg: string, groupKey: string) {
  return invoke<AssignmentDiscoveryRepo[]>("list_assignment_group_repos", {
    input: {
      githubOrg,
      groupKey,
    },
  });
}

export async function createAssignment(input: AssignmentForm) {
  return invoke<Assignment>("create_assignment", {
    input: {
      ...input,
      assignmentGroup: null,
      submissionKind: input.submissionKind,
      repoTemplate: input.repoTemplate || null,
      deadlineAt: localDateTimeInputToUtcIso(input.deadlineAt),
    },
  });
}

export async function updateAssignment(input: {
  assignmentId: number;
  deadlineAt: string;
  submissionKind: "individual" | "group";
  repoTemplate?: string;
}) {
  return invoke<Assignment>("update_assignment", {
    input: {
      assignmentId: input.assignmentId,
      deadlineAt: localDateTimeInputToUtcIso(input.deadlineAt),
      submissionKind: input.submissionKind,
      repoTemplate: input.repoTemplate?.trim() ? input.repoTemplate.trim() : null,
    },
  });
}

export async function deleteAssignment(input: {
  assignmentId: number;
  deleteLocalWorkspace?: boolean;
}) {
  return invoke<void>("delete_assignment", {
    input: {
      assignmentId: input.assignmentId,
      deleteLocalWorkspace: input.deleteLocalWorkspace ?? false,
    },
  });
}

export async function listStudentRepos(assignmentId: number) {
  return invoke<StudentRepo[]>("list_student_repos", { assignmentId });
}

export async function createStudentRepo(input: RepoForm & { assignmentId: number }) {
  return invoke<StudentRepo>("create_student_repo", { input });
}

export async function updateStudentRepo(input: {
  studentRepoId: number;
  notes: string;
  reviewStatus: string;
}) {
  return invoke<StudentRepo>("update_student_repo", { input });
}

export async function saveReviewTarget(input: {
  studentRepoId: number;
  baseSha: string;
  submissionSha: string;
  baseLabel: string;
  submissionLabel: string;
}) {
  return invoke<StudentRepo>("save_review_target", { input });
}

export async function validateReviewTarget(input: {
  studentRepoId: number;
  baseSha: string;
  submissionSha: string;
}) {
  return invoke<{ baseExists: boolean; submissionExists: boolean }>("validate_review_target", input);
}

export async function listCommitOptions(studentRepoId: number) {
  return invoke<CommitOptions>("list_commit_options", { studentRepoId });
}

export async function listChangedFiles(studentRepoId: number) {
  return invoke<ChangedFile[]>("list_changed_files", { studentRepoId });
}

export async function getFileContent(input: {
  studentRepoId: number;
  path: string;
  side: string;
}) {
  return invoke<FileContentResult>("get_file_content", { input });
}

export async function getFileDiff(input: { studentRepoId: number; path: string }) {
  return invoke<FileDiffResult>("get_file_diff", { input });
}

export async function getReviewFileData(input: { studentRepoId: number; path: string }) {
  return invoke<ReviewFileData>("get_review_file_data", { input });
}

export async function listDraftComments(studentRepoId: number) {
  return invoke<DraftComment[]>("list_draft_comments", { studentRepoId });
}

export async function createDraftComment(input: {
  studentRepoId: number;
  filePath: string;
  startLine: number;
  lineNumber: number;
  side: string;
  body: string;
  codeContext?: string | null;
}) {
  return invoke<DraftComment>("create_draft_comment", { input });
}

export async function updateDraftComment(input: {
  commentId: number;
  startLine: number;
  lineNumber: number;
  side: string;
  body: string;
}) {
  return invoke<DraftComment>("update_draft_comment", { input });
}

export async function deleteDraftComment(commentId: number) {
  return invoke<void>("delete_draft_comment", { commentId });
}

export async function openRepoInEditor(input: {
  studentRepoId: number;
  editorCommand?: string;
}) {
  return invoke<void>("open_repo_in_editor", {
    input: {
      studentRepoId: input.studentRepoId,
      editorCommand: input.editorCommand?.trim() ? input.editorCommand.trim() : null,
    },
  });
}

export async function openFileInEditor(input: {
  studentRepoId: number;
  filePath: string;
  editorCommand?: string;
}) {
  return invoke<void>("open_file_in_editor", {
    input: {
      studentRepoId: input.studentRepoId,
      filePath: input.filePath,
      editorCommand: input.editorCommand?.trim() ? input.editorCommand.trim() : null,
    },
  });
}

export async function openExternalLink(url: string) {
  return invoke<void>("open_external_link", {
    input: {
      url,
    },
  });
}

export async function publishDraftComments(studentRepoId: number) {
  return invoke<PublishDraftCommentsResult>("publish_draft_comments", { studentRepoId });
}

export async function startPublishDraftCommentsJob(studentRepoId: number) {
  return invoke<BackgroundJob>("start_publish_draft_comments_job", { studentRepoId });
}

export async function submitPendingReview(input: {
  studentRepoId: number;
  event: ReviewSubmissionEvent;
  body?: string;
}) {
  return invoke<SubmitPendingReviewResult>("submit_pending_review", {
    input: {
      studentRepoId: input.studentRepoId,
      event: input.event,
      body: input.body?.trim() ? input.body.trim() : null,
    },
  });
}

export async function startSubmitPendingReviewJob(input: {
  studentRepoId: number;
  event: ReviewSubmissionEvent;
  body?: string;
}) {
  return invoke<BackgroundJob>("start_submit_pending_review_job", {
    input: {
      studentRepoId: input.studentRepoId,
      event: input.event,
      body: input.body?.trim() ? input.body.trim() : null,
    },
  });
}

export async function discardPendingReview(studentRepoId: number) {
  return invoke<DraftComment[]>("discard_pending_review", { studentRepoId });
}

export async function startDiscardPendingReviewJob(studentRepoId: number) {
  return invoke<BackgroundJob>("start_discard_pending_review_job", { studentRepoId });
}

export async function syncAssignmentRepos(assignmentId: number) {
  return invoke<{ importedCount: number; totalCount: number; missingCount: number }>(
    "sync_assignment_repos",
    {
      assignmentId,
    },
  );
}

export async function startSyncAssignmentReposJob(assignmentId: number) {
  return invoke<BackgroundJob>("start_sync_assignment_repos_job", { assignmentId });
}

export async function importClassroomRoster(input: { assignmentId: number; csvContent: string }) {
  return invoke<{ importedCount: number; skippedCount: number; totalCount: number }>(
    "import_classroom_roster",
    { input },
  );
}

export async function prepareReview(studentRepoId: number) {
  return invoke<{ prUrl: string }>("prepare_review", { studentRepoId });
}

export async function startPrepareReviewJob(studentRepoId: number) {
  return invoke<BackgroundJob>("start_prepare_review_job", { studentRepoId });
}

export async function listBackgroundJobs() {
  return invoke<BackgroundJob[]>("list_background_jobs");
}

export async function getBackgroundJob(jobId: number) {
  return invoke<BackgroundJob | null>("get_background_job", { jobId });
}

export async function dismissBackgroundJob(jobId: number) {
  return invoke<void>("dismiss_background_job", { jobId });
}

export async function exportLocalData() {
  return invoke<LocalDataSnapshot>("export_local_data");
}

export async function importLocalData(snapshot: LocalDataSnapshot) {
  return invoke<void>("import_local_data", { snapshot });
}
