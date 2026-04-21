#![allow(dead_code)]

use rusqlite::Connection;

use super::super::models::{Submission, SubmissionMember};
use super::super::AppResult;

pub fn map_submission(row: &rusqlite::Row<'_>) -> rusqlite::Result<Submission> {
    Ok(Submission {
        id: row.get("id")?,
        assignment_id: row.get("assignment_id")?,
        repo_owner: row.get("repo_owner")?,
        repo_name: row.get("repo_name")?,
        repo_url: row.get("repo_url")?,
        default_branch: row.get("default_branch")?,
        local_path: row.get("local_path")?,
        review_status: row.get("review_status")?,
        notes: row.get("notes")?,
        pr_url: row.get("pr_url")?,
        pr_number: row.get("pr_number")?,
        last_error: row.get("last_error")?,
        base_sha: row.get("base_sha")?,
        submission_sha: row.get("submission_sha")?,
        base_label: row.get("base_label")?,
        submission_label: row.get("submission_label")?,
        base_branch_name: row.get("base_branch_name")?,
        submission_branch_name: row.get("submission_branch_name")?,
        last_prepared_at: row.get("last_prepared_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn map_submission_member(row: &rusqlite::Row<'_>) -> rusqlite::Result<SubmissionMember> {
    Ok(SubmissionMember {
        id: row.get("id")?,
        submission_id: row.get("submission_id")?,
        student_key: row.get("student_key")?,
        student_name: row.get("student_name")?,
        github_username: row.get("github_username")?,
        github_id: row.get("github_id")?,
        group_name: row.get("group_name")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn fetch_submission(conn: &Connection, submission_id: i64) -> AppResult<Submission> {
    conn.query_row(
        "SELECT * FROM submissions WHERE id = ?1",
        [submission_id],
        map_submission,
    )
    .map_err(|err| err.to_string())
}

pub fn list_submissions_inner(conn: &Connection, assignment_id: i64) -> AppResult<Vec<Submission>> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM submissions WHERE assignment_id = ?1
             ORDER BY review_status ASC, repo_name COLLATE NOCASE ASC",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([assignment_id], map_submission)
        .map_err(|err| err.to_string())?;
    let mut submissions = Vec::new();
    for row in rows {
        submissions.push(row.map_err(|err| err.to_string())?);
    }
    Ok(submissions)
}

pub fn list_submission_members_inner(
    conn: &Connection,
    submission_id: i64,
) -> AppResult<Vec<SubmissionMember>> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM submission_members WHERE submission_id = ?1
             ORDER BY student_name COLLATE NOCASE ASC, id ASC",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([submission_id], map_submission_member)
        .map_err(|err| err.to_string())?;
    let mut members = Vec::new();
    for row in rows {
        members.push(row.map_err(|err| err.to_string())?);
    }
    Ok(members)
}

pub fn assignment_submission_count(conn: &Connection, assignment_id: i64) -> AppResult<usize> {
    let total_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM submissions WHERE assignment_id = ?1",
            [assignment_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    Ok(total_count as usize)
}
