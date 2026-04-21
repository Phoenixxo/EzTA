use rusqlite::params;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use super::super::db::{
    assignment_workspace, map_assignment, map_draft_comment, map_student_repo, now_ts, open_conn,
};
use super::super::models::{
    LocalDataSnapshot, SnapshotAssignment, SnapshotDraftComment, SnapshotStudentRepo,
};
use super::super::state::AppState;
use super::super::AppResult;

#[tauri::command]
pub fn export_local_data(state: tauri::State<'_, AppState>) -> AppResult<LocalDataSnapshot> {
    let conn = open_conn(&state.ctx)?;

    let assignments = {
        let mut stmt = conn
            .prepare("SELECT * FROM assignments ORDER BY updated_at DESC, id DESC")
            .map_err(|err| err.to_string())?;
        let rows = stmt
            .query_map([], map_assignment)
            .map_err(|err| err.to_string())?;
        let mut values = Vec::new();
        for row in rows {
            let assignment = row.map_err(|err| err.to_string())?;
            values.push(SnapshotAssignment {
                id: assignment.id,
                name: assignment.name,
                github_org: assignment.github_org,
                repo_prefix: assignment.repo_prefix,
                assignment_group: assignment.assignment_group,
                submission_kind: assignment.submission_kind,
                repo_template: assignment.repo_template,
                deadline_at: assignment.deadline_at,
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
            });
        }
        values
    };

    let student_repos = {
        let mut stmt = conn
            .prepare("SELECT * FROM student_repos ORDER BY assignment_id ASC, id ASC")
            .map_err(|err| err.to_string())?;
        let rows = stmt
            .query_map([], map_student_repo)
            .map_err(|err| err.to_string())?;
        let mut values = Vec::new();
        for row in rows {
            let repo = row.map_err(|err| err.to_string())?;
            values.push(SnapshotStudentRepo {
                id: repo.id,
                assignment_id: repo.assignment_id,
                student_key: repo.student_key,
                student_name: repo.student_name,
                github_username: repo.github_username,
                github_id: repo.github_id,
                roster_group_name: repo.roster_group_name,
                repo_owner: repo.repo_owner,
                repo_name: repo.repo_name,
                repo_url: repo.repo_url,
                default_branch: repo.default_branch,
                review_status: repo.review_status,
                notes: repo.notes,
                pr_url: repo.pr_url,
                pr_number: repo.pr_number,
                last_error: repo.last_error,
                base_sha: repo.base_sha,
                submission_sha: repo.submission_sha,
                base_label: repo.base_label,
                submission_label: repo.submission_label,
                base_branch_name: repo.base_branch_name,
                submission_branch_name: repo.submission_branch_name,
                last_prepared_at: repo.last_prepared_at,
                updated_at: repo.updated_at,
            });
        }
        values
    };

    let draft_comments = {
        let mut stmt = conn
            .prepare("SELECT * FROM draft_comments ORDER BY student_repo_id ASC, id ASC")
            .map_err(|err| err.to_string())?;
        let rows = stmt
            .query_map([], map_draft_comment)
            .map_err(|err| err.to_string())?;
        let mut values = Vec::new();
        for row in rows {
            let comment = row.map_err(|err| err.to_string())?;
            values.push(SnapshotDraftComment {
                id: comment.id,
                student_repo_id: comment.student_repo_id,
                submission_id: comment.submission_id,
                file_path: comment.file_path,
                start_line: comment.start_line,
                line_number: comment.line_number,
                side: comment.side,
                body: comment.body,
                code_context: comment.code_context,
                publish_status: comment.publish_status,
                github_review_id: comment.github_review_id,
                github_review_url: comment.github_review_url,
                github_comment_id: comment.github_comment_id,
                github_comment_url: comment.github_comment_url,
                last_error: comment.last_error,
                published_at: comment.published_at,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
            });
        }
        values
    };

    Ok(LocalDataSnapshot {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: 1,
        exported_at: now_ts(),
        assignments,
        student_repos,
        draft_comments,
    })
}

#[tauri::command]
pub fn import_local_data(
    snapshot: LocalDataSnapshot,
    state: tauri::State<'_, AppState>,
) -> AppResult<()> {
    if snapshot.schema_version != 1 {
        return Err(format!(
            "unsupported backup schema version {}; expected 1",
            snapshot.schema_version
        ));
    }

    let conn = open_conn(&state.ctx)?;
    let tx = conn.unchecked_transaction().map_err(|err| err.to_string())?;

    tx.execute("DELETE FROM draft_comments", [])
        .map_err(|err| err.to_string())?;
    tx.execute("DELETE FROM student_repos", [])
        .map_err(|err| err.to_string())?;
    tx.execute("DELETE FROM assignments", [])
        .map_err(|err| err.to_string())?;

    let mut assignment_id_map = HashMap::new();
    for assignment in snapshot.assignments {
        let workspace_path = assignment_workspace(&state.ctx, &assignment.name);
        fs::create_dir_all(&workspace_path).map_err(|err| err.to_string())?;
        tx.execute(
            "INSERT INTO assignments (
                name, github_org, repo_prefix, assignment_group, submission_kind, repo_template, deadline_at,
                workspace_path, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                assignment.name.trim(),
                assignment.github_org.trim(),
                assignment.repo_prefix.trim(),
                assignment.assignment_group,
                assignment.submission_kind,
                assignment.repo_template,
                assignment.deadline_at,
                workspace_path.to_string_lossy().to_string(),
                assignment.created_at,
                assignment.updated_at,
            ],
        )
        .map_err(|err| err.to_string())?;
        assignment_id_map.insert(assignment.id, tx.last_insert_rowid());
    }

    let mut student_repo_id_map = HashMap::new();
    for repo in snapshot.student_repos {
        let mapped_assignment_id = assignment_id_map
            .get(&repo.assignment_id)
            .copied()
            .ok_or_else(|| format!("backup referenced missing assignment {}", repo.assignment_id))?;
        let assignment_workspace_path: String = tx
            .query_row(
                "SELECT workspace_path FROM assignments WHERE id = ?1",
                [mapped_assignment_id],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;
        let local_path = PathBuf::from(assignment_workspace_path).join(&repo.repo_name);
        tx.execute(
            "INSERT INTO student_repos (
                assignment_id, student_key, student_name, github_username, github_id, roster_group_name,
                repo_owner, repo_name, repo_url, default_branch, local_path, review_status, notes,
                pr_url, pr_number, last_error, base_sha, submission_sha, base_label, submission_label,
                base_branch_name, submission_branch_name, last_prepared_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
            params![
                mapped_assignment_id,
                repo.student_key,
                repo.student_name,
                repo.github_username,
                repo.github_id,
                repo.roster_group_name,
                repo.repo_owner,
                repo.repo_name,
                repo.repo_url,
                repo.default_branch,
                local_path.to_string_lossy().to_string(),
                repo.review_status,
                repo.notes,
                repo.pr_url,
                repo.pr_number,
                repo.last_error,
                repo.base_sha,
                repo.submission_sha,
                repo.base_label,
                repo.submission_label,
                repo.base_branch_name,
                repo.submission_branch_name,
                repo.last_prepared_at,
                repo.updated_at,
            ],
        )
        .map_err(|err| err.to_string())?;
        student_repo_id_map.insert(repo.id, tx.last_insert_rowid());
    }

    for comment in snapshot.draft_comments {
        let mapped_student_repo_id = student_repo_id_map
            .get(&comment.student_repo_id)
            .copied()
            .ok_or_else(|| format!("backup referenced missing student repo {}", comment.student_repo_id))?;
        tx.execute(
            "INSERT INTO draft_comments (
                student_repo_id, submission_id, file_path, start_line, line_number, side, body, code_context,
                publish_status, github_review_id, github_review_url, github_comment_id, github_comment_url,
                last_error, published_at, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                mapped_student_repo_id,
                comment.submission_id.or(Some(mapped_student_repo_id)),
                comment.file_path,
                comment.start_line,
                comment.line_number,
                comment.side,
                comment.body,
                comment.code_context,
                comment.publish_status,
                comment.github_review_id,
                comment.github_review_url,
                comment.github_comment_id,
                comment.github_comment_url,
                comment.last_error,
                comment.published_at,
                comment.created_at,
                comment.updated_at,
            ],
        )
        .map_err(|err| err.to_string())?;
    }

    tx.commit().map_err(|err| err.to_string())?;
    Ok(())
}
