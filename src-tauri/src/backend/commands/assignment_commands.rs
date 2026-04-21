use rusqlite::params;
use std::fs;
use std::path::PathBuf;

use super::super::db::{
    assignment_submission_count, assignment_workspace, fetch_assignment, fetch_submission,
    list_assignments_inner, list_submissions_inner, normalize_deadline, now_ts, open_conn,
    slugify, update_assignment_timestamp, upsert_submission_member,
};
use super::super::external::{
    apply_repo_template, commit_exists, ensure_local_repo, fetch_existing_pr,
    fetch_all_remote_heads, find_deadline_submission_from_push_events, run_command, run_json_command,
    should_include_roster_row,
};
use super::super::models::{
    Assignment, CommitOptions, CommitRef, CreateAssignmentInput, CreateStudentRepoInput, GhPr,
    GhRepo, ImportRosterInput, ImportRosterResult, PrepareReviewResult, RecentCommit,
    SaveReviewTargetInput, Submission, SyncResult, UpdateAssignmentInput,
    UpdateStudentRepoInput, ValidateReviewTargetResult,
};
use super::super::state::{AppContext, AppState};
use super::super::AppResult;
use super::support::parse_classroom_roster_rows;
use super::support::with_db;

fn normalize_submission_kind(value: Option<String>) -> AppResult<String> {
    match value
        .unwrap_or_else(|| "individual".to_string())
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "individual" => Ok("individual".to_string()),
        "group" => Ok("group".to_string()),
        other => Err(format!("unsupported submission kind '{}'", other)),
    }
}

fn validate_assignment_repo_template(assignment: &Assignment) -> AppResult<()> {
    if assignment.submission_kind == "group"
        && !assignment.repo_template.contains("{group_name}")
    {
        return Err(
            "group assignments require the repo template to include {group_name}".to_string(),
        );
    }
    Ok(())
}

pub(crate) fn sync_assignment_repos_inner(ctx: &AppContext, assignment_id: i64) -> AppResult<SyncResult> {
    let conn = open_conn(ctx)?;
    let repos = list_submissions_inner(&conn, assignment_id)?;
    if repos.is_empty() {
        return Err("import a classroom roster before syncing repositories".into());
    }

    let now = now_ts();
    let mut imported_count = 0usize;
    let mut missing_count = 0usize;

    for repo in repos {
        let response: AppResult<GhRepo> = run_json_command(
            "gh",
            &[
                "api",
                &format!("repos/{}/{}", repo.repo_owner.trim(), repo.repo_name.trim()),
            ],
            None,
        );

        match response {
            Ok(details) => {
                let local_path = PathBuf::from(&repo.local_path);
                conn.execute(
                    "UPDATE student_repos
                     SET repo_url = ?1, default_branch = ?2, local_path = ?3, last_error = NULL, updated_at = ?4
                     WHERE id = ?5",
                    params![
                        details.html_url,
                        details
                            .default_branch
                            .clone()
                            .unwrap_or_else(|| "main".to_string()),
                        local_path.to_string_lossy().to_string(),
                        now,
                        repo.id
                    ],
                )
                .map_err(|err| err.to_string())?;
                conn.execute(
                    "UPDATE submissions
                     SET repo_url = ?1, default_branch = ?2, local_path = ?3, last_error = NULL, updated_at = ?4
                     WHERE id = ?5",
                    params![
                        details.html_url,
                        details
                            .default_branch
                            .clone()
                            .unwrap_or_else(|| "main".to_string()),
                        local_path.to_string_lossy().to_string(),
                        now,
                        repo.id
                    ],
                )
                .map_err(|err| err.to_string())?;
                imported_count += 1;
            }
            Err(err) => {
                conn.execute(
                    "UPDATE student_repos SET last_error = ?1, updated_at = ?2 WHERE id = ?3",
                    params![err, now, repo.id],
                )
                .map_err(|db_err| db_err.to_string())?;
                conn.execute(
                    "UPDATE submissions SET last_error = ?1, updated_at = ?2 WHERE id = ?3",
                    params![err, now, repo.id],
                )
                .map_err(|db_err| db_err.to_string())?;
                missing_count += 1;
            }
        }
    }

    update_assignment_timestamp(&conn, assignment_id, now)?;

    Ok(SyncResult {
        imported_count,
        total_count: assignment_submission_count(&conn, assignment_id)?,
        missing_count,
    })
}

pub(crate) fn prepare_review_inner(
    ctx: &AppContext,
    student_repo_id: i64,
) -> AppResult<PrepareReviewResult> {
    let conn = open_conn(ctx)?;
    let repo = fetch_submission(&conn, student_repo_id)?;
    let assignment = fetch_assignment(&conn, repo.assignment_id)?;
    ensure_local_repo(&repo)?;
    let repo_path = PathBuf::from(&repo.local_path);

    let base_sha = repo
        .base_sha
        .clone()
        .ok_or_else(|| "set a base commit before preparing review".to_string())?;
    let submission_sha = repo
        .submission_sha
        .clone()
        .ok_or_else(|| "set a submission commit before preparing review".to_string())?;

    if !commit_exists(&repo_path, &base_sha) || !commit_exists(&repo_path, &submission_sha) {
        return Err("saved review target is no longer valid after fetch".into());
    }

    let assignment_slug = slugify(&assignment.name);
    let base_branch = format!("ezta/review-base/{assignment_slug}");
    let submission_branch = format!("ezta/review-submission/{assignment_slug}");

    run_command("git", &["branch", "-f", &base_branch, &base_sha], Some(&repo_path))?;
    run_command(
        "git",
        &["branch", "-f", &submission_branch, &submission_sha],
        Some(&repo_path),
    )?;
    run_command(
        "git",
        &[
            "push",
            "origin",
            &format!("+refs/heads/{base_branch}:refs/heads/{base_branch}"),
        ],
        Some(&repo_path),
    )?;
    run_command(
        "git",
        &[
            "push",
            "origin",
            &format!("+refs/heads/{submission_branch}:refs/heads/{submission_branch}"),
        ],
        Some(&repo_path),
    )?;

    let pr = if let Some(existing) = fetch_existing_pr(&repo, &base_branch, &submission_branch)? {
        existing
    } else {
        let title = format!("EzTA review: {} ({})", repo.student_name, assignment.name);
        let body = format!(
            "Prepared by EzTA for review.\n\nBase: {}\nSubmission: {}",
            repo.base_label.clone().unwrap_or(base_sha.clone()),
            repo.submission_label.clone().unwrap_or(submission_sha.clone())
        );
        let url = run_command(
            "gh",
            &[
                "pr",
                "create",
                "--repo",
                &format!("{}/{}", repo.repo_owner, repo.repo_name),
                "--base",
                &base_branch,
                "--head",
                &submission_branch,
                "--title",
                &title,
                "--body",
                &body,
            ],
            None,
        )?;
        fetch_existing_pr(&repo, &base_branch, &submission_branch)?
            .unwrap_or(GhPr { number: 0, url })
    };

    let pr_number = if pr.number == 0 { None } else { Some(pr.number) };
    conn.execute(
        "UPDATE student_repos SET
            base_branch_name = ?1,
            submission_branch_name = ?2,
            pr_url = ?3,
            pr_number = ?4,
            review_status = 'prepared',
            last_error = NULL,
            last_prepared_at = ?5,
            updated_at = ?5
         WHERE id = ?6",
        params![
            base_branch,
            submission_branch,
            pr.url,
            pr_number,
            now_ts(),
            student_repo_id
        ],
    )
    .map_err(|err| err.to_string())?;
    conn.execute(
        "UPDATE submissions SET
            base_branch_name = ?1,
            submission_branch_name = ?2,
            pr_url = ?3,
            pr_number = ?4,
            review_status = 'prepared',
            last_error = NULL,
            last_prepared_at = ?5,
            updated_at = ?5
         WHERE id = ?6",
        params![
            base_branch,
            submission_branch,
            pr.url,
            pr_number,
            now_ts(),
            student_repo_id
        ],
    )
    .map_err(|err| err.to_string())?;

    Ok(PrepareReviewResult {
        pr_url: pr.url,
        pr_number,
        base_branch_name: format!("ezta/review-base/{assignment_slug}"),
        submission_branch_name: format!("ezta/review-submission/{assignment_slug}"),
    })
}

#[tauri::command]
pub fn list_assignments(state: tauri::State<'_, AppState>) -> AppResult<Vec<Assignment>> {
    with_db(&state, list_assignments_inner)
}

#[tauri::command]
pub fn create_assignment(
    input: CreateAssignmentInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<Assignment> {
    let now = now_ts();
    let deadline_at = normalize_deadline(input.deadline_at)?;
    let submission_kind = normalize_submission_kind(input.submission_kind)?;
    let repo_template = input
        .repo_template
        .unwrap_or_else(|| "{assignment_name}-{github_username}".to_string());
    let workspace_path = assignment_workspace(&state.ctx, &input.name);
    fs::create_dir_all(&workspace_path).map_err(|err| err.to_string())?;
    with_db(&state, |conn| {
        conn.execute(
            "INSERT INTO assignments (name, github_org, repo_prefix, assignment_group, submission_kind, repo_template, deadline_at, workspace_path, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                input.name.trim(),
                input.github_org.trim(),
                input.repo_prefix.trim(),
                input.assignment_group.as_ref().map(|value| value.trim().to_string()),
                submission_kind,
                repo_template.trim(),
                deadline_at,
                workspace_path.to_string_lossy().to_string(),
                now,
                now
            ],
        )
        .map_err(|err| err.to_string())?;
        fetch_assignment(conn, conn.last_insert_rowid())
    })
}

#[tauri::command]
pub fn update_assignment(
    input: UpdateAssignmentInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<Assignment> {
    let deadline_at = normalize_deadline(input.deadline_at)?;
    let submission_kind = match input.submission_kind {
        Some(value) => Some(normalize_submission_kind(Some(value))?),
        None => None,
    };
    let repo_template = input
        .repo_template
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    with_db(&state, |conn| {
        conn.execute(
            "UPDATE assignments
             SET deadline_at = ?1,
                 submission_kind = COALESCE(?2, submission_kind),
                 repo_template = COALESCE(?3, repo_template),
                 updated_at = ?4
             WHERE id = ?5",
            params![deadline_at, submission_kind, repo_template, now_ts(), input.assignment_id],
        )
        .map_err(|err| err.to_string())?;
        fetch_assignment(conn, input.assignment_id)
    })
}

#[tauri::command]
pub fn delete_assignment(
    input: super::super::models::DeleteAssignmentInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<()> {
    let assignment = with_db(&state, |conn| fetch_assignment(conn, input.assignment_id))?;

    with_db(&state, |conn| {
        conn.execute(
            "DELETE FROM student_repos WHERE assignment_id = ?1",
            [input.assignment_id],
        )
        .map_err(|err| err.to_string())?;
        conn.execute("DELETE FROM assignments WHERE id = ?1", [input.assignment_id])
            .map_err(|err| err.to_string())?;
        Ok(())
    })?;

    if input.delete_local_workspace {
        let workspace_path = PathBuf::from(assignment.workspace_path);
        if workspace_path.exists() {
            fs::remove_dir_all(&workspace_path).map_err(|err| err.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn list_student_repos(
    assignment_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<Vec<Submission>> {
    with_db(&state, |conn| list_submissions_inner(conn, assignment_id))
}

#[tauri::command]
pub fn create_student_repo(
    input: CreateStudentRepoInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<Submission> {
    with_db(&state, |conn| {
        let assignment = fetch_assignment(conn, input.assignment_id)?;
        let now = now_ts();
        let local_path = PathBuf::from(&assignment.workspace_path).join(&input.repo_name);
        let repo_url = format!(
            "https://github.com/{}/{}",
            input.repo_owner.trim(),
            input.repo_name.trim()
        );
        conn.execute(
            "INSERT INTO student_repos (
                assignment_id, student_key, student_name, repo_owner, repo_name, repo_url,
                default_branch, local_path, review_status, notes, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'not_started', '', ?9)
            ON CONFLICT(assignment_id, repo_owner, repo_name) DO UPDATE SET
                student_key = excluded.student_key,
                student_name = excluded.student_name,
                default_branch = excluded.default_branch,
                repo_url = excluded.repo_url,
                local_path = excluded.local_path,
                updated_at = excluded.updated_at",
            params![
                input.assignment_id,
                input.student_key.trim(),
                input.student_name.trim(),
                input.repo_owner.trim(),
                input.repo_name.trim(),
                repo_url,
                input.default_branch.clone().unwrap_or_else(|| "main".to_string()),
                local_path.to_string_lossy().to_string(),
                now
            ],
        )
        .map_err(|err| err.to_string())?;
        conn.execute(
            "INSERT INTO submissions (
                assignment_id, repo_owner, repo_name, repo_url, default_branch, local_path,
                review_status, notes, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'not_started', '', ?7)
            ON CONFLICT(assignment_id, repo_owner, repo_name) DO UPDATE SET
                default_branch = excluded.default_branch,
                repo_url = excluded.repo_url,
                local_path = excluded.local_path,
                updated_at = excluded.updated_at",
            params![
                input.assignment_id,
                input.repo_owner.trim(),
                input.repo_name.trim(),
                repo_url,
                input.default_branch.clone().unwrap_or_else(|| "main".to_string()),
                local_path.to_string_lossy().to_string(),
                now
            ],
        )
        .map_err(|err| err.to_string())?;
        let submission_id: i64 = conn
            .query_row(
                "SELECT id FROM submissions WHERE assignment_id = ?1 AND repo_owner = ?2 AND repo_name = ?3",
                params![input.assignment_id, input.repo_owner.trim(), input.repo_name.trim()],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;
        upsert_submission_member(
            conn,
            submission_id,
            input.student_key.trim(),
            input.student_name.trim(),
            None,
            None,
            None,
            now,
        )?;
        fetch_submission(conn, submission_id)
    })
}

#[tauri::command]
pub fn import_classroom_roster(
    input: ImportRosterInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<ImportRosterResult> {
    with_db(&state, |conn| {
    let assignment = fetch_assignment(conn, input.assignment_id)?;
    validate_assignment_repo_template(&assignment)?;
    let now = now_ts();
    let mut imported_count = 0usize;
    let mut skipped_count = 0usize;
    let mut skipped_missing_identity = 0usize;
    let mut skipped_empty_repo_name = 0usize;
    let mut skipped_missing_group_name = 0usize;
    let rows = parse_classroom_roster_rows(&input.csv_content)?;

    for row in rows {
        if row.github_username.trim().is_empty() || row.identifier.trim().is_empty() {
            skipped_count += 1;
            skipped_missing_identity += 1;
            continue;
        }
        if assignment.submission_kind == "group"
            && row
                .group_name
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .is_none()
        {
            skipped_count += 1;
            skipped_missing_group_name += 1;
            continue;
        }
        if !should_include_roster_row(&assignment, &row) {
            skipped_count += 1;
            continue;
        }

        let repo_name = apply_repo_template(&assignment, &assignment.repo_template, &row);
        if repo_name.trim().is_empty() {
            skipped_count += 1;
            skipped_empty_repo_name += 1;
            continue;
        }

        let local_path = PathBuf::from(&assignment.workspace_path).join(&repo_name);
        let repo_url = format!(
            "https://github.com/{}/{}",
            assignment.github_org.trim(),
            repo_name.trim()
        );

        conn.execute(
            "INSERT INTO student_repos (
                assignment_id, student_key, student_name, github_username, github_id, roster_group_name,
                repo_owner, repo_name, repo_url, default_branch, local_path, review_status, notes, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'main', ?10, 'not_started', '', ?11)
            ON CONFLICT(assignment_id, repo_owner, repo_name) DO UPDATE SET
                student_key = excluded.student_key,
                student_name = excluded.student_name,
                github_username = excluded.github_username,
                github_id = excluded.github_id,
                roster_group_name = excluded.roster_group_name,
                repo_url = excluded.repo_url,
                local_path = excluded.local_path,
                updated_at = excluded.updated_at",
            params![
                input.assignment_id,
                row.identifier.trim(),
                row.name.trim(),
                row.github_username.trim(),
                row.github_id.as_deref().map(str::trim),
                row.group_name.as_deref().map(str::trim),
                assignment.github_org.trim(),
                repo_name.trim(),
                repo_url,
                local_path.to_string_lossy().to_string(),
                now
            ],
        )
        .map_err(|err| err.to_string())?;
        conn.execute(
            "INSERT INTO submissions (
                assignment_id, repo_owner, repo_name, repo_url, default_branch, local_path, review_status, notes, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, 'main', ?5, 'not_started', '', ?6)
            ON CONFLICT(assignment_id, repo_owner, repo_name) DO UPDATE SET
                default_branch = excluded.default_branch,
                repo_url = excluded.repo_url,
                local_path = excluded.local_path,
                updated_at = excluded.updated_at",
            params![
                input.assignment_id,
                assignment.github_org.trim(),
                repo_name.trim(),
                repo_url,
                local_path.to_string_lossy().to_string(),
                now
            ],
        )
        .map_err(|err| err.to_string())?;
        let submission_id: i64 = conn
            .query_row(
                "SELECT id FROM submissions WHERE assignment_id = ?1 AND repo_owner = ?2 AND repo_name = ?3",
                params![input.assignment_id, assignment.github_org.trim(), repo_name.trim()],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;
        upsert_submission_member(
            conn,
            submission_id,
            row.identifier.trim(),
            row.name.trim(),
            Some(row.github_username.trim()),
            row.github_id.as_deref().map(str::trim),
            row.group_name.as_deref().map(str::trim),
            now,
        )?;
        imported_count += 1;
    }

    update_assignment_timestamp(conn, input.assignment_id, now)?;
    if imported_count == 0 {
        let mut reasons = Vec::new();
        if skipped_missing_identity > 0 {
            reasons.push(format!(
                "{} row(s) were missing identifier or github username",
                skipped_missing_identity
            ));
        }
        if skipped_empty_repo_name > 0 {
            reasons.push(format!(
                "{} row(s) produced an empty repo name from the repo template",
                skipped_empty_repo_name
            ));
        }
        if skipped_missing_group_name > 0 {
            reasons.push(format!(
                "{} row(s) were missing group_name for a group assignment",
                skipped_missing_group_name
            ));
        }
        if reasons.is_empty() {
            reasons.push("no roster rows were eligible to import".to_string());
        }
        return Err(format!("imported 0 roster rows: {}", reasons.join("; ")));
    }

    Ok(ImportRosterResult {
        imported_count,
        skipped_count,
        total_count: assignment_submission_count(conn, input.assignment_id)?,
    })
    })
}

#[tauri::command]
pub fn update_student_repo(
    input: UpdateStudentRepoInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<Submission> {
    with_db(&state, |conn| {
        conn.execute(
            "UPDATE student_repos SET notes = ?1, review_status = ?2, updated_at = ?3 WHERE id = ?4",
            params![input.notes, input.review_status, now_ts(), input.student_repo_id],
        )
        .map_err(|err| err.to_string())?;
        conn.execute(
            "UPDATE submissions SET notes = ?1, review_status = ?2, updated_at = ?3 WHERE id = ?4",
            params![input.notes, input.review_status, now_ts(), input.student_repo_id],
        )
        .map_err(|err| err.to_string())?;
        fetch_submission(conn, input.student_repo_id)
    })
}

#[tauri::command]
pub fn save_review_target(
    input: SaveReviewTargetInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<Submission> {
    let repo = with_db(&state, |conn| fetch_submission(conn, input.student_repo_id))?;
    ensure_local_repo(&repo)?;
    let repo_path = PathBuf::from(&repo.local_path);
    if input.base_sha.trim() == input.submission_sha.trim() {
        return Err("base and submission commits must be different".into());
    }
    if !commit_exists(&repo_path, input.base_sha.trim()) {
        return Err("base commit does not exist in this repository".into());
    }
    if !commit_exists(&repo_path, input.submission_sha.trim()) {
        return Err("submission commit does not exist in this repository".into());
    }
    let base_label = input
        .base_label
        .clone()
        .unwrap_or_else(|| input.base_sha.trim().to_string());
    let submission_label = input
        .submission_label
        .clone()
        .unwrap_or_else(|| input.submission_sha.trim().to_string());

    with_db(&state, |conn| {
        conn.execute(
            "UPDATE student_repos
             SET base_sha = ?1, submission_sha = ?2, base_label = ?3, submission_label = ?4, last_error = NULL, updated_at = ?5
             WHERE id = ?6",
            params![
                input.base_sha.trim(),
                input.submission_sha.trim(),
                &base_label,
                &submission_label,
                now_ts(),
                input.student_repo_id
            ],
        )
        .map_err(|err| err.to_string())?;
        conn.execute(
            "UPDATE submissions
             SET base_sha = ?1, submission_sha = ?2, base_label = ?3, submission_label = ?4, last_error = NULL, updated_at = ?5
             WHERE id = ?6",
            params![
                input.base_sha.trim(),
                input.submission_sha.trim(),
                &base_label,
                &submission_label,
                now_ts(),
                input.student_repo_id
            ],
        )
        .map_err(|err| err.to_string())?;
        fetch_submission(conn, input.student_repo_id)
    })
}

#[tauri::command]
pub fn validate_review_target(
    student_repo_id: i64,
    base_sha: String,
    submission_sha: String,
    state: tauri::State<'_, AppState>,
) -> AppResult<ValidateReviewTargetResult> {
    let repo = with_db(&state, |conn| fetch_submission(conn, student_repo_id))?;
    ensure_local_repo(&repo)?;
    let repo_path = PathBuf::from(&repo.local_path);
    Ok(ValidateReviewTargetResult {
        base_exists: commit_exists(&repo_path, base_sha.trim()),
        submission_exists: commit_exists(&repo_path, submission_sha.trim()),
    })
}

#[tauri::command]
pub fn list_commit_options(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<CommitOptions> {
    let (repo, assignment) = with_db(&state, |conn| {
        let repo = fetch_submission(conn, student_repo_id)?;
        let assignment = fetch_assignment(conn, repo.assignment_id)?;
        Ok((repo, assignment))
    })?;
    let repo_path = fetch_all_remote_heads(&repo)?;

    let refs_output = run_command(
        "git",
        &[
            "for-each-ref",
            "--format=%(refname:short)\t%(objectname)\t%(refname)",
            "refs/heads",
            "refs/remotes/origin",
            "refs/tags",
        ],
        Some(&repo_path),
    )?;

    let refs = refs_output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\t');
            let name = parts.next()?.to_string();
            let target = parts.next()?.to_string();
            let full = parts.next()?.to_string();
            let kind = if full.starts_with("refs/tags/") {
                "tag"
            } else if full.starts_with("refs/remotes/") {
                "remote"
            } else {
                "branch"
            };
            Some(CommitRef {
                name,
                target,
                kind: kind.to_string(),
            })
        })
        .collect();

    let deadline_submission = match assignment.deadline_at.as_deref() {
        Some(deadline_at) => find_deadline_submission_from_push_events(&repo, deadline_at)?,
        None => None,
    };

    let commits_output = if let Some((ref deadline_sha, _)) = deadline_submission {
        run_command(
            "git",
            &[
                "rev-list",
                "--date-order",
                "--pretty=format:%H\t%cI\t%s",
                deadline_sha,
            ],
            Some(&repo_path),
        )?
    } else {
        run_command(
            "git",
            &[
                "log",
                "--all",
                "--date-order",
                "--pretty=format:%H\t%cI\t%s",
            ],
            Some(&repo_path),
        )?
    };
    let recent_commits = commits_output
        .lines()
        .filter_map(|line| {
            if !line.contains('\t') {
                return None;
            }
            let mut parts = line.splitn(3, '\t');
            Some(RecentCommit {
                sha: parts.next()?.to_string(),
                committed_at: parts.next().unwrap_or("").to_string(),
                summary: parts.next().unwrap_or("").to_string(),
            })
        })
        .collect();

    Ok(CommitOptions {
        refs,
        recent_commits,
        deadline_submission_sha: deadline_submission.as_ref().map(|(sha, _)| sha.clone()),
        deadline_submission_event_at: deadline_submission.map(|(_, event_at)| event_at),
    })
}

#[tauri::command]
pub fn sync_assignment_repos(
    assignment_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<SyncResult> {
    sync_assignment_repos_inner(&state.ctx, assignment_id)
}

#[tauri::command]
pub fn prepare_review(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<PrepareReviewResult> {
    prepare_review_inner(&state.ctx, student_repo_id)
}
