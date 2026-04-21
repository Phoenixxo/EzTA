use rusqlite::Connection;

use super::super::AppResult;

pub fn init_db(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            github_org TEXT NOT NULL,
            repo_prefix TEXT NOT NULL DEFAULT '',
            assignment_group TEXT,
            submission_kind TEXT NOT NULL DEFAULT 'individual',
            repo_template TEXT NOT NULL DEFAULT '{assignment_name}-{github_username}',
            deadline_at TEXT,
            workspace_path TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS student_repos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assignment_id INTEGER NOT NULL,
            student_key TEXT NOT NULL DEFAULT '',
            student_name TEXT NOT NULL DEFAULT '',
            github_username TEXT,
            github_id TEXT,
            roster_group_name TEXT,
            repo_owner TEXT NOT NULL,
            repo_name TEXT NOT NULL,
            repo_url TEXT NOT NULL,
            default_branch TEXT NOT NULL DEFAULT 'main',
            local_path TEXT NOT NULL,
            review_status TEXT NOT NULL DEFAULT 'not_started',
            notes TEXT NOT NULL DEFAULT '',
            pr_url TEXT,
            pr_number INTEGER,
            last_error TEXT,
            base_sha TEXT,
            submission_sha TEXT,
            base_label TEXT,
            submission_label TEXT,
            base_branch_name TEXT,
            submission_branch_name TEXT,
            last_prepared_at INTEGER,
            updated_at INTEGER NOT NULL,
            UNIQUE(assignment_id, repo_owner, repo_name)
        );

        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assignment_id INTEGER NOT NULL,
            repo_owner TEXT NOT NULL,
            repo_name TEXT NOT NULL,
            repo_url TEXT NOT NULL,
            default_branch TEXT NOT NULL DEFAULT 'main',
            local_path TEXT NOT NULL,
            review_status TEXT NOT NULL DEFAULT 'not_started',
            notes TEXT NOT NULL DEFAULT '',
            pr_url TEXT,
            pr_number INTEGER,
            last_error TEXT,
            base_sha TEXT,
            submission_sha TEXT,
            base_label TEXT,
            submission_label TEXT,
            base_branch_name TEXT,
            submission_branch_name TEXT,
            last_prepared_at INTEGER,
            updated_at INTEGER NOT NULL,
            UNIQUE(assignment_id, repo_owner, repo_name)
        );

        CREATE TABLE IF NOT EXISTS submission_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER NOT NULL,
            student_key TEXT NOT NULL DEFAULT '',
            student_name TEXT NOT NULL DEFAULT '',
            github_username TEXT,
            github_id TEXT,
            group_name TEXT,
            updated_at INTEGER NOT NULL,
            UNIQUE(submission_id, student_key)
        );

        CREATE TABLE IF NOT EXISTS draft_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_repo_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            start_line INTEGER,
            line_number INTEGER NOT NULL,
            side TEXT NOT NULL,
            body TEXT NOT NULL,
            code_context TEXT,
            publish_status TEXT NOT NULL DEFAULT 'draft',
            github_review_id INTEGER,
            github_review_url TEXT,
            github_comment_id INTEGER,
            github_comment_url TEXT,
            last_error TEXT,
            published_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS org_repo_index (
            github_org TEXT NOT NULL,
            repo_name TEXT NOT NULL,
            repo_url TEXT NOT NULL,
            fetched_at INTEGER NOT NULL,
            PRIMARY KEY (github_org, repo_name)
        );
        ",
    )
    .map_err(|err| err.to_string())?;

    let _ = conn.execute("ALTER TABLE assignments ADD COLUMN deadline_at TEXT", []);
    let _ = conn.execute("ALTER TABLE assignments ADD COLUMN assignment_group TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE assignments ADD COLUMN submission_kind TEXT NOT NULL DEFAULT 'individual'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE assignments ADD COLUMN repo_template TEXT NOT NULL DEFAULT '{assignment_name}-{github_username}'",
        [],
    );
    let _ = conn.execute("ALTER TABLE student_repos ADD COLUMN github_username TEXT", []);
    let _ = conn.execute("ALTER TABLE student_repos ADD COLUMN github_id TEXT", []);
    let _ = conn.execute("ALTER TABLE student_repos ADD COLUMN roster_group_name TEXT", []);
    let _ = conn.execute("ALTER TABLE draft_comments ADD COLUMN start_line INTEGER", []);
    let _ = conn.execute(
        "ALTER TABLE draft_comments ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'draft'",
        [],
    );
    let _ = conn.execute("ALTER TABLE draft_comments ADD COLUMN github_review_id INTEGER", []);
    let _ = conn.execute("ALTER TABLE draft_comments ADD COLUMN github_review_url TEXT", []);
    let _ = conn.execute("ALTER TABLE draft_comments ADD COLUMN github_comment_id INTEGER", []);
    let _ = conn.execute("ALTER TABLE draft_comments ADD COLUMN github_comment_url TEXT", []);
    let _ = conn.execute("ALTER TABLE draft_comments ADD COLUMN last_error TEXT", []);
    let _ = conn.execute("ALTER TABLE draft_comments ADD COLUMN published_at INTEGER", []);
    Ok(())
}
