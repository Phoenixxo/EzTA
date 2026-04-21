export type Assignment = {
  id: number;
  name: string;
  githubOrg: string;
  repoPrefix: string;
  assignmentGroup: string | null;
  submissionKind: SubmissionKind;
  repoTemplate: string;
  deadlineAt: string | null;
  workspacePath: string;
  createdAt: number;
  updatedAt: number;
};

export type SubmissionKind = "individual" | "group";

export type EditorPreference = "system" | "application";

export type GithubConnectionStatus = {
  gitInstalled: boolean;
  gitVersion: string | null;
  ghInstalled: boolean;
  ghVersion: string | null;
  ghAuthenticated: boolean;
  githubLogin: string | null;
  statusSummary: string;
  detail: string | null;
};

export type AppUpdaterOverview = {
  currentVersion: string;
};

export type AppUpdateCheckResult = {
  currentVersion: string;
  available: boolean;
  version: string | null;
  date: string | null;
  body: string | null;
};

export type AppUpdateInstallResult = {
  installedVersion: string;
  restarted: boolean;
};

export type AssignmentDiscoveryGroup = {
  groupKey: string;
  githubOrg: string;
  repoCount: number;
  examples: string[];
};

export type AssignmentDiscoveryRepo = {
  repoName: string;
  repoUrl: string;
  studentSuffix: string;
};

export type OrgRepoIndexStatus = {
  githubOrg: string;
  repoCount: number;
  fetchedAt: number;
};

export type BackgroundJob = {
  id: number;
  kind: string;
  label: string;
  status: "queued" | "running" | "succeeded" | "failed";
  message: string;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
  result: unknown | null;
};

export type LocalDataSnapshot = {
  appVersion: string;
  schemaVersion: number;
  exportedAt: number;
  assignments: unknown[];
  studentRepos: unknown[];
  draftComments: unknown[];
};

export type StudentRepo = {
  id: number;
  assignmentId: number;
  studentKey: string;
  studentName: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  defaultBranch: string;
  localPath: string;
  reviewStatus: string;
  notes: string;
  prUrl: string | null;
  prNumber: number | null;
  lastError: string | null;
  baseSha: string | null;
  submissionSha: string | null;
  baseLabel: string | null;
  submissionLabel: string | null;
  baseBranchName: string | null;
  submissionBranchName: string | null;
  lastPreparedAt: number | null;
  updatedAt: number;
};

export type ChangedFile = {
  path: string;
  previousPath: string | null;
  status: string;
};

export type FileContentResult = {
  path: string;
  side: string;
  content: string;
};

export type FileDiffResult = {
  path: string;
  diff: string;
};

export type ReviewFileData = {
  path: string;
  diff: string;
  baseContent: string | null;
  submissionContent: string | null;
};

export type DraftComment = {
  id: number;
  studentRepoId: number;
  filePath: string;
  startLine: number;
  lineNumber: number;
  side: string;
  body: string;
  codeContext: string | null;
  publishStatus: "draft" | "queued_for_review" | "published" | "failed_to_map";
  githubReviewId: number | null;
  githubReviewUrl: string | null;
  githubCommentId: number | null;
  githubCommentUrl: string | null;
  lastError: string | null;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type PublishDraftCommentsResult = {
  queuedCount: number;
  failedCount: number;
  pendingReviewId: number | null;
  pendingReviewUrl: string | null;
  comments: DraftComment[];
};

export type ReviewSubmissionEvent = "COMMENT";

export type SubmitPendingReviewResult = {
  submittedCount: number;
  comments: DraftComment[];
};

export type CommitRef = {
  name: string;
  target: string;
  kind: string;
};

export type RecentCommit = {
  sha: string;
  committedAt: string;
  summary: string;
};

export type CommitOptions = {
  refs: CommitRef[];
  recentCommits: RecentCommit[];
  deadlineSubmissionSha: string | null;
  deadlineSubmissionEventAt: string | null;
};

export type AssignmentForm = {
  name: string;
  githubOrg: string;
  repoPrefix: string;
  submissionKind: SubmissionKind;
  repoTemplate: string;
  deadlineAt: string;
};

export type RepoForm = {
  studentKey: string;
  studentName: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
};

export const emptyAssignmentForm: AssignmentForm = {
  name: "",
  githubOrg: "",
  repoPrefix: "",
  submissionKind: "individual",
  repoTemplate: "{assignment_name}-{github_username}",
  deadlineAt: "",
};

export const emptyRepoForm: RepoForm = {
  studentKey: "",
  studentName: "",
  repoOwner: "",
  repoName: "",
  defaultBranch: "main",
};

export const reviewStatuses = ["all", "not_started", "prepared", "reviewed"] as const;

export type ReviewStatusFilter = (typeof reviewStatuses)[number];

export const queueSorts = ["student", "repo", "status", "updated"] as const;

export type QueueSort = (typeof queueSorts)[number];
