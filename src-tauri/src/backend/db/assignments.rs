use rusqlite::{params, Connection};
use std::path::PathBuf;

use super::super::models::Assignment;
use super::super::state::AppContext;
use super::super::AppResult;
use super::util::slugify;

pub fn map_assignment(row: &rusqlite::Row<'_>) -> rusqlite::Result<Assignment> {
    Ok(Assignment {
        id: row.get("id")?,
        name: row.get("name")?,
        github_org: row.get("github_org")?,
        repo_prefix: row.get("repo_prefix")?,
        assignment_group: row.get("assignment_group")?,
        repo_template: row.get("repo_template")?,
        deadline_at: row.get("deadline_at")?,
        workspace_path: row.get("workspace_path")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn fetch_assignment(conn: &Connection, assignment_id: i64) -> AppResult<Assignment> {
    conn.query_row(
        "SELECT * FROM assignments WHERE id = ?1",
        [assignment_id],
        map_assignment,
    )
    .map_err(|err| err.to_string())
}

pub fn list_assignments_inner(conn: &Connection) -> AppResult<Vec<Assignment>> {
    let mut stmt = conn
        .prepare("SELECT * FROM assignments ORDER BY updated_at DESC, id DESC")
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([], map_assignment)
        .map_err(|err| err.to_string())?;
    let mut assignments = Vec::new();
    for row in rows {
        assignments.push(row.map_err(|err| err.to_string())?);
    }
    Ok(assignments)
}

pub fn assignment_workspace(ctx: &AppContext, name: &str) -> PathBuf {
    ctx.workspace_root.join(slugify(name))
}

pub fn update_assignment_timestamp(conn: &Connection, assignment_id: i64, ts: i64) -> AppResult<()> {
    conn.execute(
        "UPDATE assignments SET updated_at = ?1 WHERE id = ?2",
        params![ts, assignment_id],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}
