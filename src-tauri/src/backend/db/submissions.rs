use rusqlite::{params, Connection};

use super::super::models::{Submission, SubmissionMember};
use super::super::AppResult;

fn map_submission_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Submission> {
    Ok(Submission {
        id: row.get("id")?,
        assignment_id: row.get("assignment_id")?,
        student_key: String::new(),
        student_name: String::new(),
        github_username: None,
        github_id: None,
        roster_group_name: None,
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
        members: Vec::new(),
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

fn apply_members(mut submission: Submission, members: Vec<SubmissionMember>) -> Submission {
    let primary_member = members
        .iter()
        .find(|member| !member.student_key.trim().is_empty() || !member.student_name.trim().is_empty())
        .or_else(|| members.first());

    submission.student_key = primary_member
        .map(|member| member.student_key.clone())
        .unwrap_or_default();
    submission.student_name = primary_member
        .map(|member| member.student_name.clone())
        .unwrap_or_default();
    submission.github_username = primary_member.and_then(|member| member.github_username.clone());
    submission.github_id = primary_member.and_then(|member| member.github_id.clone());
    submission.roster_group_name = primary_member.and_then(|member| member.group_name.clone());
    submission.members = members;
    submission
}

pub fn list_submission_members_inner(
    conn: &Connection,
    submission_id: i64,
) -> AppResult<Vec<SubmissionMember>> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM submission_members WHERE submission_id = ?1
             ORDER BY student_name COLLATE NOCASE ASC, student_key COLLATE NOCASE ASC, id ASC",
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

pub fn fetch_submission(conn: &Connection, submission_id: i64) -> AppResult<Submission> {
    let submission = conn
        .query_row(
            "SELECT * FROM submissions WHERE id = ?1",
            [submission_id],
            map_submission_row,
        )
        .map_err(|err| err.to_string())?;
    let members = list_submission_members_inner(conn, submission_id)?;
    Ok(apply_members(submission, members))
}

pub fn list_submissions_inner(conn: &Connection, assignment_id: i64) -> AppResult<Vec<Submission>> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM submissions WHERE assignment_id = ?1
             ORDER BY review_status ASC, repo_name COLLATE NOCASE ASC",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([assignment_id], map_submission_row)
        .map_err(|err| err.to_string())?;
    let mut submissions = Vec::new();
    for row in rows {
        let submission = row.map_err(|err| err.to_string())?;
        let members = list_submission_members_inner(conn, submission.id)?;
        submissions.push(apply_members(submission, members));
    }
    Ok(submissions)
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

pub fn upsert_submission_member(
    conn: &Connection,
    submission_id: i64,
    student_key: &str,
    student_name: &str,
    github_username: Option<&str>,
    github_id: Option<&str>,
    group_name: Option<&str>,
    updated_at: i64,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO submission_members (
            submission_id, student_key, student_name, github_username, github_id, group_name, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(submission_id, student_key) DO UPDATE SET
            student_name = excluded.student_name,
            github_username = excluded.github_username,
            github_id = excluded.github_id,
            group_name = excluded.group_name,
            updated_at = excluded.updated_at",
        params![
            submission_id,
            student_key,
            student_name,
            github_username,
            github_id,
            group_name,
            updated_at,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}
