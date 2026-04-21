use rusqlite::params;
use std::collections::HashMap;
use std::collections::HashSet;
use std::path::PathBuf;

use super::super::db::{fetch_student_repo, map_draft_comment, now_ts, open_conn};
use super::super::external::{
    create_pending_pr_review, current_github_login, discard_pending_pr_review,
    fetch_pr_author_login, find_current_pending_pr_review_id, require_local_repo, run_command,
    submit_pending_pr_review,
};
use super::super::models::{
    ChangedFile, CreateDraftCommentInput, DraftComment, FileContentInput, FileContentResult,
    FileDiffInput, FileDiffResult, PendingReviewComment, PublishDraftCommentsResult, ReviewFileData,
    ReviewFileDataInput, SubmitPendingReviewInput, SubmitPendingReviewResult,
    UpdateDraftCommentInput,
};
use super::super::state::{AppContext, AppState};
use super::super::AppResult;
use super::support::{
    diff_range_maps, list_draft_comments_inner, require_review_shas, with_db,
};

pub(crate) fn publish_draft_comments_inner(
    ctx: &AppContext,
    student_repo_id: i64,
) -> AppResult<PublishDraftCommentsResult> {
    let conn = open_conn(ctx)?;
    let repo = fetch_student_repo(&conn, student_repo_id)?;
    let pr_number = repo
        .pr_number
        .ok_or_else(|| "prepare the PR before publishing draft comments".to_string())?;
    let (base_sha, submission_sha) = require_review_shas(&repo)?;
    super::super::external::ensure_local_repo(&repo)?;
    let draft_comments = list_draft_comments_inner(&conn, student_repo_id)?;
    let queued_review_ids = draft_comments
        .iter()
        .filter(|comment| comment.publish_status == "queued_for_review")
        .filter_map(|comment| comment.github_review_id)
        .collect::<HashSet<_>>();
    if !queued_review_ids.is_empty() {
        return Err(
            "submit or discard the existing pending review before queueing a new one".to_string(),
        );
    }
    let pending_comments = draft_comments
        .into_iter()
        .filter(|comment| comment.publish_status != "published")
        .collect::<Vec<_>>();

    if pending_comments.is_empty() {
        return Ok(PublishDraftCommentsResult {
            queued_count: 0,
            failed_count: 0,
            pending_review_id: None,
            pending_review_url: None,
            comments: list_draft_comments_inner(&conn, student_repo_id)?,
        });
    }

    let repo_path = PathBuf::from(&repo.local_path);
    let mut diff_cache = HashMap::<String, String>::new();
    let mut queueable_comments = Vec::<(DraftComment, PendingReviewComment)>::new();
    let mut failed_count = 0usize;
    let now = now_ts();

    for comment in pending_comments {
        let diff = if let Some(cached) = diff_cache.get(&comment.file_path) {
            cached.clone()
        } else {
            let loaded = run_command(
                "git",
                &[
                    "diff",
                    "--unified=3",
                    &base_sha,
                    &submission_sha,
                    "--",
                    &comment.file_path,
                ],
                Some(&repo_path),
            )?;
            diff_cache.insert(comment.file_path.clone(), loaded.clone());
            loaded
        };

        if !diff_range_maps(&diff, &comment.side, comment.start_line, comment.line_number) {
            conn.execute(
                "UPDATE draft_comments
                 SET publish_status = 'failed_to_map', last_error = ?1, updated_at = ?2
                 WHERE id = ?3",
                params![
                    "selected line range is not part of the prepared PR diff",
                    now,
                    comment.id
                ],
            )
            .map_err(|err| err.to_string())?;
            failed_count += 1;
            continue;
        }
        queueable_comments.push((
            comment.clone(),
            PendingReviewComment {
                path: comment.file_path.clone(),
                body: comment.body.clone(),
                side: if comment.side.eq_ignore_ascii_case("base") {
                    "LEFT".to_string()
                } else {
                    "RIGHT".to_string()
                },
                line: comment.line_number,
                start_line: (comment.start_line != comment.line_number)
                    .then_some(comment.start_line),
                start_side: (comment.start_line != comment.line_number).then(|| {
                    if comment.side.eq_ignore_ascii_case("base") {
                        "LEFT".to_string()
                    } else {
                        "RIGHT".to_string()
                    }
                }),
            },
        ));
    }

    if queueable_comments.is_empty() {
        return Ok(PublishDraftCommentsResult {
            queued_count: 0,
            failed_count,
            pending_review_id: None,
            pending_review_url: None,
            comments: list_draft_comments_inner(&conn, student_repo_id)?,
        });
    }

    let review_payload = queueable_comments
        .iter()
        .map(|(_, payload)| payload.clone())
        .collect::<Vec<_>>();

    match create_pending_pr_review(&repo, pr_number, &submission_sha, &review_payload) {
        Ok(review) => {
            let review_url = review
                .resolved_url()
                .ok_or_else(|| "GitHub review response did not include a review URL".to_string())?
                .to_string();
            for (comment, _) in &queueable_comments {
                conn.execute(
                    "UPDATE draft_comments
                     SET publish_status = 'queued_for_review',
                         github_review_id = ?1,
                         github_review_url = ?2,
                         github_comment_id = NULL,
                         github_comment_url = NULL,
                         last_error = NULL,
                         published_at = NULL,
                         updated_at = ?3
                     WHERE id = ?4",
                    params![review.id, review_url, now, comment.id],
                )
                .map_err(|err| err.to_string())?;
            }

            Ok(PublishDraftCommentsResult {
                queued_count: queueable_comments.len(),
                failed_count,
                pending_review_id: Some(review.id),
                pending_review_url: Some(review_url),
                comments: list_draft_comments_inner(&conn, student_repo_id)?,
            })
        }
        Err(err) => {
            for (comment, _) in &queueable_comments {
                conn.execute(
                    "UPDATE draft_comments
                     SET publish_status = 'draft',
                         last_error = ?1,
                         updated_at = ?2
                     WHERE id = ?3",
                    params![err, now, comment.id],
                )
                .map_err(|db_err| db_err.to_string())?;
            }

            Ok(PublishDraftCommentsResult {
                queued_count: 0,
                failed_count: failed_count + queueable_comments.len(),
                pending_review_id: None,
                pending_review_url: None,
                comments: list_draft_comments_inner(&conn, student_repo_id)?,
            })
        }
    }
}

pub(crate) fn submit_pending_review_inner(
    ctx: &AppContext,
    input: SubmitPendingReviewInput,
) -> AppResult<SubmitPendingReviewResult> {
    let conn = open_conn(ctx)?;
    let repo = fetch_student_repo(&conn, input.student_repo_id)?;
    let pr_number = repo
        .pr_number
        .ok_or_else(|| "prepare the PR before submitting a review".to_string())?;
    let queued_comments = list_draft_comments_inner(&conn, input.student_repo_id)?
        .into_iter()
        .filter(|comment| comment.publish_status == "queued_for_review")
        .collect::<Vec<_>>();
    if queued_comments.is_empty() {
        return Err("no pending review is queued for submission".to_string());
    }

    let review_ids = queued_comments
        .iter()
        .filter_map(|comment| comment.github_review_id)
        .collect::<HashSet<_>>();
    if review_ids.len() != 1 {
        return Err("pending review state is inconsistent; discard and re-queue the review".to_string());
    }
    let stored_review_id = *review_ids.iter().next().unwrap();
    let event = input.event.trim().to_ascii_uppercase();
    if event != "APPROVE" && event != "REQUEST_CHANGES" && event != "COMMENT" {
        return Err("review event must be COMMENT, APPROVE, or REQUEST_CHANGES".to_string());
    }
    let review_id =
        find_current_pending_pr_review_id(&repo, pr_number)?.unwrap_or(stored_review_id);
    let trimmed_body = input.body.as_deref().map(str::trim).filter(|value| !value.is_empty());
    if event == "APPROVE" || event == "REQUEST_CHANGES" {
        let current_login = current_github_login()?;
        let pr_author_login = fetch_pr_author_login(&repo, pr_number)?;
        if pr_author_login
            .as_deref()
            .map(|author| author.eq_ignore_ascii_case(&current_login))
            .unwrap_or(false)
        {
            return Err(format!(
                "GitHub does not allow you to {} your own pull request. Use Comment instead.",
                if event == "APPROVE" {
                    "approve"
                } else {
                    "request changes on"
                }
            ));
        }
    }
    let body = if let Some(body) = trimmed_body {
        Some(body)
    } else if event == "COMMENT" {
        Some("Submitted from EzTA.")
    } else if event == "REQUEST_CHANGES" {
        Some("Changes requested from EzTA.")
    } else {
        None
    };

    submit_pending_pr_review(&repo, pr_number, review_id, &event, body)?;
    let now = now_ts();
    for comment in &queued_comments {
        conn.execute(
            "UPDATE draft_comments
             SET publish_status = 'published',
                 last_error = NULL,
                 published_at = ?1,
                 updated_at = ?1
             WHERE id = ?2",
            params![now, comment.id],
        )
        .map_err(|err| err.to_string())?;
    }

    Ok(SubmitPendingReviewResult {
        submitted_count: queued_comments.len(),
        comments: list_draft_comments_inner(&conn, input.student_repo_id)?,
    })
}

pub(crate) fn discard_pending_review_inner(
    ctx: &AppContext,
    student_repo_id: i64,
) -> AppResult<Vec<DraftComment>> {
    let conn = open_conn(ctx)?;
    let repo = fetch_student_repo(&conn, student_repo_id)?;
    let pr_number = repo
        .pr_number
        .ok_or_else(|| "prepare the PR before discarding a pending review".to_string())?;
    let queued_comments = list_draft_comments_inner(&conn, student_repo_id)?
        .into_iter()
        .filter(|comment| comment.publish_status == "queued_for_review")
        .collect::<Vec<_>>();
    if queued_comments.is_empty() {
        return Ok(list_draft_comments_inner(&conn, student_repo_id)?);
    }
    let review_ids = queued_comments
        .iter()
        .filter_map(|comment| comment.github_review_id)
        .collect::<HashSet<_>>();
    if review_ids.len() != 1 {
        return Err("pending review state is inconsistent; queued comments reference multiple reviews".to_string());
    }
    let review_id = *review_ids.iter().next().unwrap();
    discard_pending_pr_review(&repo, pr_number, review_id)?;
    let now = now_ts();
    for comment in &queued_comments {
        conn.execute(
            "UPDATE draft_comments
             SET publish_status = 'draft',
                 github_review_id = NULL,
                 github_review_url = NULL,
                 last_error = NULL,
                 updated_at = ?1
             WHERE id = ?2",
            params![now, comment.id],
        )
        .map_err(|err| err.to_string())?;
    }

    list_draft_comments_inner(&conn, student_repo_id)
}

#[tauri::command]
pub fn list_changed_files(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<Vec<ChangedFile>> {
    let repo = with_db(&state, |conn| fetch_student_repo(conn, student_repo_id))?;
    let repo_path = require_local_repo(&repo)?;
    let (base_sha, submission_sha) = require_review_shas(&repo)?;
    let output = run_command(
        "git",
        &[
            "diff",
            "--name-status",
            "--find-renames",
            &base_sha,
            &submission_sha,
        ],
        Some(&repo_path),
    )?;
    let files = output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\t').collect();
            let status_code = *parts.first()?;
            let status = status_code.chars().next()?.to_string();
            match status.as_str() {
                "R" => Some(ChangedFile {
                    path: parts.get(2)?.to_string(),
                    previous_path: Some(parts.get(1)?.to_string()),
                    status: "renamed".to_string(),
                }),
                "A" => Some(ChangedFile {
                    path: parts.get(1)?.to_string(),
                    previous_path: None,
                    status: "added".to_string(),
                }),
                "D" => Some(ChangedFile {
                    path: parts.get(1)?.to_string(),
                    previous_path: None,
                    status: "deleted".to_string(),
                }),
                "M" => Some(ChangedFile {
                    path: parts.get(1)?.to_string(),
                    previous_path: None,
                    status: "modified".to_string(),
                }),
                _ => None,
            }
        })
        .collect();
    Ok(files)
}

#[tauri::command]
pub fn get_file_content(
    input: FileContentInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<FileContentResult> {
    let repo = with_db(&state, |conn| fetch_student_repo(conn, input.student_repo_id))?;
    let repo_path = require_local_repo(&repo)?;
    let (base_sha, submission_sha) = require_review_shas(&repo)?;
    let target_sha = if input.side == "base" {
        base_sha
    } else {
        submission_sha
    };
    let content = run_command(
        "git",
        &["show", &format!("{}:{}", target_sha, input.path)],
        Some(&repo_path),
    )?;
    Ok(FileContentResult {
        path: input.path,
        side: input.side,
        content,
    })
}

#[tauri::command]
pub fn get_file_diff(
    input: FileDiffInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<FileDiffResult> {
    let repo = with_db(&state, |conn| fetch_student_repo(conn, input.student_repo_id))?;
    let repo_path = require_local_repo(&repo)?;
    let (base_sha, submission_sha) = require_review_shas(&repo)?;
    let diff = run_command(
        "git",
        &[
            "diff",
            "--unified=3",
            &base_sha,
            &submission_sha,
            "--",
            &input.path,
        ],
        Some(&repo_path),
    )?;
    Ok(FileDiffResult {
        path: input.path,
        diff,
    })
}

#[tauri::command]
pub fn get_review_file_data(
    input: ReviewFileDataInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<ReviewFileData> {
    let repo = with_db(&state, |conn| fetch_student_repo(conn, input.student_repo_id))?;
    let repo_path = require_local_repo(&repo)?;
    let (base_sha, submission_sha) = require_review_shas(&repo)?;

    let diff = run_command(
        "git",
        &[
            "diff",
            "--unified=3",
            &base_sha,
            &submission_sha,
            "--",
            &input.path,
        ],
        Some(&repo_path),
    )?;

    let base_content = run_command(
        "git",
        &["show", &format!("{}:{}", base_sha, input.path)],
        Some(&repo_path),
    )
    .ok();

    let submission_content = run_command(
        "git",
        &["show", &format!("{}:{}", submission_sha, input.path)],
        Some(&repo_path),
    )
    .ok();

    Ok(ReviewFileData {
        path: input.path,
        diff,
        base_content,
        submission_content,
    })
}

#[tauri::command]
pub fn list_draft_comments(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<Vec<DraftComment>> {
    with_db(&state, |conn| list_draft_comments_inner(conn, student_repo_id))
}

#[tauri::command]
pub fn create_draft_comment(
    input: CreateDraftCommentInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<DraftComment> {
    let now = now_ts();
    with_db(&state, |conn| {
        conn.execute(
            "INSERT INTO draft_comments (
                student_repo_id, submission_id, file_path, start_line, line_number, side, body, code_context,
                publish_status, github_comment_id, github_comment_url, last_error, published_at, created_at, updated_at
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'draft', NULL, NULL, NULL, NULL, ?9, ?10)",
            params![
                input.student_repo_id,
                input.student_repo_id,
                input.file_path,
                input.start_line,
                input.line_number,
                input.side,
                input.body,
                input.code_context,
                now,
                now
            ],
        )
        .map_err(|err| err.to_string())?;
        conn.query_row(
            "SELECT * FROM draft_comments WHERE id = ?1",
            [conn.last_insert_rowid()],
            map_draft_comment,
        )
        .map_err(|err| err.to_string())
    })
}

#[tauri::command]
pub fn update_draft_comment(
    input: UpdateDraftCommentInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<DraftComment> {
    with_db(&state, |conn| {
    let publish_status: String = conn
        .query_row(
            "SELECT publish_status FROM draft_comments WHERE id = ?1",
            [input.comment_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    if publish_status == "queued_for_review" {
        return Err("discard or submit the pending review before editing queued comments".to_string());
    }
    conn.execute(
        "UPDATE draft_comments
         SET start_line = ?1,
             line_number = ?2,
             side = ?3,
             body = ?4,
             publish_status = 'draft',
             github_review_id = NULL,
             github_review_url = NULL,
             github_comment_id = NULL,
             github_comment_url = NULL,
             last_error = NULL,
             published_at = NULL,
             updated_at = ?5
         WHERE id = ?6",
        params![
            input.start_line,
            input.line_number,
            input.side,
            input.body,
            now_ts(),
            input.comment_id
        ],
    )
    .map_err(|err| err.to_string())?;
    conn.query_row(
        "SELECT * FROM draft_comments WHERE id = ?1",
        [input.comment_id],
        map_draft_comment,
    )
    .map_err(|err| err.to_string())
    })
}

#[tauri::command]
pub fn delete_draft_comment(
    comment_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<()> {
    with_db(&state, |conn| {
    let publish_status: String = conn
        .query_row(
            "SELECT publish_status FROM draft_comments WHERE id = ?1",
            [comment_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    if publish_status == "queued_for_review" {
        return Err("discard or submit the pending review before deleting queued comments".to_string());
    }
    conn.execute("DELETE FROM draft_comments WHERE id = ?1", [comment_id])
        .map_err(|err| err.to_string())?;
    Ok(())
    })
}

#[tauri::command]
pub fn publish_draft_comments(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<PublishDraftCommentsResult> {
    publish_draft_comments_inner(&state.ctx, student_repo_id)
}

#[tauri::command]
pub fn submit_pending_review(
    input: SubmitPendingReviewInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<SubmitPendingReviewResult> {
    submit_pending_review_inner(&state.ctx, input)
}

#[tauri::command]
pub fn discard_pending_review(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<Vec<DraftComment>> {
    discard_pending_review_inner(&state.ctx, student_repo_id)
}
