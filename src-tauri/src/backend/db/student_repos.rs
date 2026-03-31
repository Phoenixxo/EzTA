use rusqlite::Connection;

use super::super::models::StudentRepo;
use super::super::AppResult;

pub fn map_student_repo(row: &rusqlite::Row<'_>) -> rusqlite::Result<StudentRepo> {
    Ok(StudentRepo {
        id: row.get("id")?,
        assignment_id: row.get("assignment_id")?,
        student_key: row.get("student_key")?,
        student_name: row.get("student_name")?,
        github_username: row.get("github_username")?,
        github_id: row.get("github_id")?,
        roster_group_name: row.get("roster_group_name")?,
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

pub fn fetch_student_repo(conn: &Connection, student_repo_id: i64) -> AppResult<StudentRepo> {
    conn.query_row(
        "SELECT * FROM student_repos WHERE id = ?1",
        [student_repo_id],
        map_student_repo,
    )
    .map_err(|err| err.to_string())
}

pub fn list_student_repos_inner(conn: &Connection, assignment_id: i64) -> AppResult<Vec<StudentRepo>> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM student_repos WHERE assignment_id = ?1
             ORDER BY review_status ASC, repo_name COLLATE NOCASE ASC",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([assignment_id], map_student_repo)
        .map_err(|err| err.to_string())?;
    let mut repos = Vec::new();
    for row in rows {
        repos.push(row.map_err(|err| err.to_string())?);
    }
    Ok(repos)
}

pub fn assignment_repo_count(conn: &Connection, assignment_id: i64) -> AppResult<usize> {
    let total_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM student_repos WHERE assignment_id = ?1",
            [assignment_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    Ok(total_count as usize)
}
