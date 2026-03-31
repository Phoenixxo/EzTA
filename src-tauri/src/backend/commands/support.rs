use csv::{ReaderBuilder, Trim};
use super::super::db::{
    map_draft_comment, with_conn,
};
use super::super::external::run_json_command;
use super::super::models::{ClassroomRosterRow, DraftComment, GhApiRepo, GhAuthenticatedUser, GithubConnectionStatus, StudentRepo};
use super::super::state::AppState;
use super::super::AppResult;

pub fn normalize_csv_header(value: &str) -> String {
    let mut normalized = String::with_capacity(value.len());
    let mut previous_was_separator = false;

    for ch in value.trim_start_matches('\u{feff}').trim().chars() {
        if ch.is_ascii_alphanumeric() {
            normalized.push(ch.to_ascii_lowercase());
            previous_was_separator = false;
        } else if !previous_was_separator {
            normalized.push('_');
            previous_was_separator = true;
        }
    }

    normalized.trim_matches('_').to_string()
}

pub fn header_index(headers: &csv::StringRecord, aliases: &[&str]) -> Option<usize> {
    let normalized_aliases: Vec<String> =
        aliases.iter().map(|value| normalize_csv_header(value)).collect();
    headers.iter().position(|header| {
        let normalized = normalize_csv_header(header);
        normalized_aliases.iter().any(|alias| alias == &normalized)
    })
}

pub fn parse_classroom_roster_rows(csv_content: &str) -> AppResult<Vec<ClassroomRosterRow>> {
    let mut reader = ReaderBuilder::new()
        .trim(Trim::All)
        .flexible(true)
        .from_reader(csv_content.as_bytes());
    let headers = reader
        .headers()
        .map_err(|err| format!("invalid roster CSV header: {}", err))?
        .clone();

    let identifier_idx = header_index(&headers, &["identifier", "student_id"])
        .ok_or_else(|| "roster is missing an identifier column".to_string())?;
    let github_username_idx = header_index(
        &headers,
        &["github_username", "github username", "github login", "github_user"],
    )
    .ok_or_else(|| "roster is missing a github_username column".to_string())?;
    let name_idx = header_index(&headers, &["name", "student_name"])
        .ok_or_else(|| "roster is missing a name column".to_string())?;
    let github_id_idx = header_index(&headers, &["github_id", "github id"]);
    let group_name_idx = header_index(&headers, &["group_name", "group name"]);

    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|err| format!("invalid roster CSV row: {}", err))?;
        let row = ClassroomRosterRow {
            identifier: record.get(identifier_idx).unwrap_or("").trim().to_string(),
            github_username: record.get(github_username_idx).unwrap_or("").trim().to_string(),
            github_id: github_id_idx
                .and_then(|index| record.get(index))
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned),
            name: record.get(name_idx).unwrap_or("").trim().to_string(),
            group_name: group_name_idx
                .and_then(|index| record.get(index))
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned),
        };
        rows.push(row);
    }

    Ok(rows)
}

pub fn fetch_org_repos_from_gh(github_org: &str) -> AppResult<Vec<GhApiRepo>> {
    let org = github_org.trim();
    if org.is_empty() {
        return Err("github org is required for discovery".to_string());
    }
    let mut repos: Vec<GhApiRepo> = run_json_command(
        "gh",
        &["repo", "list", org, "--limit", "5000", "--json", "name,url"],
        None,
    )?;
    repos.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(repos)
}

pub fn require_review_shas(repo: &StudentRepo) -> AppResult<(String, String)> {
    let base_sha = repo
        .base_sha
        .clone()
        .ok_or_else(|| "set a base commit before using the review workspace".to_string())?;
    let submission_sha = repo
        .submission_sha
        .clone()
        .ok_or_else(|| "set a submission commit before using the review workspace".to_string())?;
    Ok((base_sha, submission_sha))
}

pub fn list_draft_comments_inner(
    conn: &rusqlite::Connection,
    student_repo_id: i64,
) -> AppResult<Vec<DraftComment>> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM draft_comments WHERE student_repo_id = ?1 ORDER BY updated_at DESC, id DESC",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([student_repo_id], map_draft_comment)
        .map_err(|err| err.to_string())?;
    let mut comments = Vec::new();
    for row in rows {
        comments.push(row.map_err(|err| err.to_string())?);
    }
    Ok(comments)
}

pub fn with_db<T>(
    state: &tauri::State<'_, AppState>,
    f: impl FnOnce(&rusqlite::Connection) -> AppResult<T>,
) -> AppResult<T> {
    with_conn(state, f)
}

pub fn diff_range_maps(diff: &str, side: &str, start_line: i64, end_line: i64) -> bool {
    let target_is_base = side.eq_ignore_ascii_case("base");

    for line in diff.lines() {
        if !line.starts_with("@@ ") {
            continue;
        }
        let Some((base_range, submission_range)) = line
            .strip_prefix("@@ ")
            .and_then(|value| value.split_once(" @@"))
            .map(|(header, _)| header)
            .and_then(|header| header.split_once(' '))
        else {
            continue;
        };

        let target_range = if target_is_base {
            base_range
        } else {
            submission_range
        };

        let Some(target_range) =
            target_range.strip_prefix(if target_is_base { '-' } else { '+' })
        else {
            continue;
        };

        let (start, length) = match target_range.split_once(',') {
            Some((start, length)) => (start, length),
            None => (target_range, "1"),
        };

        let Ok(start) = start.parse::<i64>() else {
            continue;
        };
        let Ok(length) = length.parse::<i64>() else {
            continue;
        };
        let hunk_end = if length == 0 { start } else { start + length - 1 };
        if start_line >= start && end_line <= hunk_end {
            return true;
        }
    }

    false
}

pub fn fetch_github_login() -> Option<String> {
    run_json_command::<GhAuthenticatedUser>("gh", &["api", "user"], None)
        .ok()
        .map(|user| user.login)
}

pub fn connected_status(
    git_version: Option<String>,
    gh_version: Option<String>,
    detail: String,
) -> GithubConnectionStatus {
    let github_login = fetch_github_login();
    GithubConnectionStatus {
        git_installed: true,
        git_version,
        gh_installed: true,
        gh_version,
        gh_authenticated: true,
        github_login: github_login.clone(),
        status_summary: match github_login {
            Some(login) => format!("Connected to GitHub as {}.", login),
            None => "Connected to GitHub through GitHub CLI.".to_string(),
        },
        detail: Some(detail),
    }
}
