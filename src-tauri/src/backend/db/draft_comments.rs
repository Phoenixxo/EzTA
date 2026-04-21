use super::super::models::DraftComment;

pub fn map_draft_comment(row: &rusqlite::Row<'_>) -> rusqlite::Result<DraftComment> {
    let line_number = row.get("line_number")?;
    Ok(DraftComment {
        id: row.get("id")?,
        student_repo_id: row.get("student_repo_id")?,
        submission_id: row.get::<_, Option<i64>>("submission_id")?,
        file_path: row.get("file_path")?,
        start_line: row
            .get::<_, Option<i64>>("start_line")?
            .unwrap_or(line_number),
        line_number,
        side: row.get("side")?,
        body: row.get("body")?,
        code_context: row.get("code_context")?,
        publish_status: row
            .get::<_, Option<String>>("publish_status")?
            .unwrap_or_else(|| "draft".to_string()),
        github_review_id: row.get::<_, Option<i64>>("github_review_id")?,
        github_review_url: row.get::<_, Option<String>>("github_review_url")?,
        github_comment_id: row.get::<_, Option<i64>>("github_comment_id")?,
        github_comment_url: row.get::<_, Option<String>>("github_comment_url")?,
        last_error: row.get::<_, Option<String>>("last_error")?,
        published_at: row.get::<_, Option<i64>>("published_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}
