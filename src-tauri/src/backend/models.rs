use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Assignment {
    pub id: i64,
    pub name: String,
    pub github_org: String,
    pub repo_prefix: String,
    pub assignment_group: Option<String>,
    pub repo_template: String,
    pub deadline_at: Option<String>,
    pub workspace_path: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentRepo {
    pub id: i64,
    pub assignment_id: i64,
    pub student_key: String,
    pub student_name: String,
    pub github_username: Option<String>,
    pub github_id: Option<String>,
    pub roster_group_name: Option<String>,
    pub repo_owner: String,
    pub repo_name: String,
    pub repo_url: String,
    pub default_branch: String,
    pub local_path: String,
    pub review_status: String,
    pub notes: String,
    pub pr_url: Option<String>,
    pub pr_number: Option<i64>,
    pub last_error: Option<String>,
    pub base_sha: Option<String>,
    pub submission_sha: Option<String>,
    pub base_label: Option<String>,
    pub submission_label: Option<String>,
    pub base_branch_name: Option<String>,
    pub submission_branch_name: Option<String>,
    pub last_prepared_at: Option<i64>,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    pub path: String,
    pub previous_path: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContentResult {
    pub path: String,
    pub side: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffResult {
    pub path: String,
    pub diff: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewFileData {
    pub path: String,
    pub diff: String,
    pub base_content: Option<String>,
    pub submission_content: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftComment {
    pub id: i64,
    pub student_repo_id: i64,
    pub file_path: String,
    pub start_line: i64,
    pub line_number: i64,
    pub side: String,
    pub body: String,
    pub code_context: Option<String>,
    pub publish_status: String,
    pub github_review_id: Option<i64>,
    pub github_review_url: Option<String>,
    pub github_comment_id: Option<i64>,
    pub github_comment_url: Option<String>,
    pub last_error: Option<String>,
    pub published_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitRef {
    pub name: String,
    pub target: String,
    pub kind: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentCommit {
    pub sha: String,
    pub summary: String,
    pub committed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitOptions {
    pub refs: Vec<CommitRef>,
    pub recent_commits: Vec<RecentCommit>,
    pub deadline_submission_sha: Option<String>,
    pub deadline_submission_event_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateReviewTargetResult {
    pub base_exists: bool,
    pub submission_exists: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareReviewResult {
    pub pr_url: String,
    pub pr_number: Option<i64>,
    pub base_branch_name: String,
    pub submission_branch_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub imported_count: usize,
    pub total_count: usize,
    pub missing_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRosterResult {
    pub imported_count: usize,
    pub skipped_count: usize,
    pub total_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentDiscoveryGroup {
    pub group_key: String,
    pub github_org: String,
    pub repo_count: usize,
    pub examples: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentDiscoveryRepo {
    pub repo_name: String,
    pub repo_url: String,
    pub student_suffix: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgRepoIndexStatus {
    pub github_org: String,
    pub repo_count: usize,
    pub fetched_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssignmentInput {
    pub name: String,
    pub github_org: String,
    pub repo_prefix: String,
    pub assignment_group: Option<String>,
    pub repo_template: Option<String>,
    pub deadline_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAssignmentInput {
    pub assignment_id: i64,
    pub deadline_at: Option<String>,
    pub repo_template: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAssignmentInput {
    pub assignment_id: i64,
    pub delete_local_workspace: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRosterInput {
    pub assignment_id: i64,
    pub csv_content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverAssignmentsInput {
    pub github_org: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverAssignmentGroupReposInput {
    pub github_org: String,
    pub group_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshOrgRepoIndexInput {
    pub github_org: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentRepoInput {
    pub assignment_id: i64,
    pub student_key: String,
    pub student_name: String,
    pub repo_owner: String,
    pub repo_name: String,
    pub default_branch: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStudentRepoInput {
    pub student_repo_id: i64,
    pub notes: String,
    pub review_status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveReviewTargetInput {
    pub student_repo_id: i64,
    pub base_sha: String,
    pub submission_sha: String,
    pub base_label: Option<String>,
    pub submission_label: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContentInput {
    pub student_repo_id: i64,
    pub path: String,
    pub side: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffInput {
    pub student_repo_id: i64,
    pub path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewFileDataInput {
    pub student_repo_id: i64,
    pub path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDraftCommentInput {
    pub student_repo_id: i64,
    pub file_path: String,
    pub start_line: i64,
    pub line_number: i64,
    pub side: String,
    pub body: String,
    pub code_context: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDraftCommentInput {
    pub comment_id: i64,
    pub start_line: i64,
    pub line_number: i64,
    pub side: String,
    pub body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenInEditorInput {
    pub student_repo_id: i64,
    pub editor_command: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileInEditorInput {
    pub student_repo_id: i64,
    pub file_path: String,
    pub editor_command: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubConnectionStatus {
    pub git_installed: bool,
    pub git_version: Option<String>,
    pub gh_installed: bool,
    pub gh_version: Option<String>,
    pub gh_authenticated: bool,
    pub github_login: Option<String>,
    pub status_summary: String,
    pub detail: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdaterOverview {
    pub current_version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateCheckResult {
    pub current_version: String,
    pub available: bool,
    pub version: Option<String>,
    pub date: Option<String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateInstallResult {
    pub installed_version: String,
    pub restarted: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishDraftCommentsResult {
    pub queued_count: usize,
    pub failed_count: usize,
    pub pending_review_id: Option<i64>,
    pub pending_review_url: Option<String>,
    pub comments: Vec<DraftComment>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitPendingReviewInput {
    pub student_repo_id: i64,
    pub event: String,
    pub body: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitPendingReviewResult {
    pub submitted_count: usize,
    pub comments: Vec<DraftComment>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhDefaultBranchRef {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhRepo {
    pub name: String,
    #[serde(rename = "html_url")]
    pub html_url: String,
    #[serde(rename = "default_branch")]
    pub default_branch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhApiRepo {
    pub name: String,
    #[serde(alias = "html_url")]
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GhPr {
    pub number: i64,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GhPendingReview {
    pub id: i64,
    #[serde(alias = "html_url", alias = "pull_request_url", alias = "url")]
    pub html_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GhAuthenticatedUser {
    pub login: String,
}

#[derive(Debug, Deserialize)]
pub struct GhPushEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub created_at: String,
    pub payload: GhPushEventPayload,
}

#[derive(Debug, Deserialize)]
pub struct GhPushEventPayload {
    pub head: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClassroomRosterRow {
    pub identifier: String,
    pub github_username: String,
    pub github_id: Option<String>,
    pub name: String,
    pub group_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundJob {
    pub id: i64,
    pub kind: String,
    pub label: String,
    pub status: String,
    pub message: String,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub finished_at: Option<i64>,
    pub error: Option<String>,
    pub result: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDataSnapshot {
    pub app_version: String,
    pub schema_version: i64,
    pub exported_at: i64,
    pub assignments: Vec<SnapshotAssignment>,
    pub student_repos: Vec<SnapshotStudentRepo>,
    pub draft_comments: Vec<SnapshotDraftComment>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotAssignment {
    pub id: i64,
    pub name: String,
    pub github_org: String,
    pub repo_prefix: String,
    pub assignment_group: Option<String>,
    pub repo_template: String,
    pub deadline_at: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotStudentRepo {
    pub id: i64,
    pub assignment_id: i64,
    pub student_key: String,
    pub student_name: String,
    pub github_username: Option<String>,
    pub github_id: Option<String>,
    pub roster_group_name: Option<String>,
    pub repo_owner: String,
    pub repo_name: String,
    pub repo_url: String,
    pub default_branch: String,
    pub review_status: String,
    pub notes: String,
    pub pr_url: Option<String>,
    pub pr_number: Option<i64>,
    pub last_error: Option<String>,
    pub base_sha: Option<String>,
    pub submission_sha: Option<String>,
    pub base_label: Option<String>,
    pub submission_label: Option<String>,
    pub base_branch_name: Option<String>,
    pub submission_branch_name: Option<String>,
    pub last_prepared_at: Option<i64>,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDraftComment {
    pub id: i64,
    pub student_repo_id: i64,
    pub file_path: String,
    pub start_line: i64,
    pub line_number: i64,
    pub side: String,
    pub body: String,
    pub code_context: Option<String>,
    pub publish_status: String,
    pub github_review_id: Option<i64>,
    pub github_review_url: Option<String>,
    pub github_comment_id: Option<i64>,
    pub github_comment_url: Option<String>,
    pub last_error: Option<String>,
    pub published_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}
