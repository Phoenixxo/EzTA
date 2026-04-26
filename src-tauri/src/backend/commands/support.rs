use csv::{ReaderBuilder, Trim};
use super::super::db::{
    map_draft_comment, with_conn,
};
use super::super::external::run_json_command;
use super::super::models::{ClassroomRosterRow, DraftComment, GhApiRepo, GhAuthenticatedUser, GithubConnectionStatus, Submission};
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

fn trim_roster_field(value: &str) -> String {
    let trimmed = value.trim();
    let quote_pairs = [('"', '"'), ('\u{201c}', '\u{201d}'), ('\u{201d}', '\u{201d}')];
    for (open, close) in quote_pairs {
        if trimmed.starts_with(open) && trimmed.ends_with(close) && trimmed.len() >= 2 {
            return trimmed
                .trim_start_matches(open)
                .trim_end_matches(close)
                .trim()
                .to_string();
        }
    }
    trimmed
        .trim_matches(|ch| ch == '"' || ch == '\\' || ch == '\u{201c}' || ch == '\u{201d}')
        .trim()
        .to_string()
}

fn normalize_roster_csv_content(value: &str) -> String {
    value
        .replace("\\\"", "\"")
        .replace('\u{201c}', "\"")
        .replace('\u{201d}', "\"")
}

fn repaired_roster_record(record: &csv::StringRecord, expected_columns: usize) -> Vec<String> {
    let values: Vec<String> = record.iter().map(trim_roster_field).collect();
    if expected_columns == 0 || values.len() <= expected_columns {
        return values;
    }

    let overflow = values.len() - expected_columns;
    let mut repaired = Vec::with_capacity(expected_columns);
    repaired.push(trim_roster_field(&values[..=overflow].join(", ")));
    repaired.extend(values[(overflow + 1)..].iter().cloned());
    repaired
}

fn roster_value(record: &[String], index: usize) -> &str {
    record.get(index).map(String::as_str).unwrap_or("")
}

pub fn parse_classroom_roster_rows(csv_content: &str) -> AppResult<Vec<ClassroomRosterRow>> {
    let normalized_csv_content = normalize_roster_csv_content(csv_content);
    let mut reader = ReaderBuilder::new()
        .trim(Trim::All)
        .flexible(true)
        .from_reader(normalized_csv_content.as_bytes());
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
        let record = repaired_roster_record(&record, headers.len());
        let row = ClassroomRosterRow {
            identifier: roster_value(&record, identifier_idx).to_string(),
            github_username: roster_value(&record, github_username_idx).to_string(),
            github_id: github_id_idx
                .map(|index| roster_value(&record, index))
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned),
            name: roster_value(&record, name_idx).to_string(),
            group_name: group_name_idx
                .map(|index| roster_value(&record, index))
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned),
        };
        rows.push(row);
    }

    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::parse_classroom_roster_rows;

    #[test]
    fn parses_quoted_identifier_with_comma() {
        let rows = parse_classroom_roster_rows(
            "identifier,github_username,github_id,name,group_name\n\
             \"Lab 01, Student Alpha\",alpha-user-1,900000001,Alex Example,DemoSection\n",
        )
        .expect("roster should parse");

        assert_eq!(rows[0].identifier, "Lab 01, Student Alpha");
        assert_eq!(rows[0].github_username, "alpha-user-1");
        assert_eq!(rows[0].github_id.as_deref(), Some("900000001"));
        assert_eq!(rows[0].name, "Alex Example");
        assert_eq!(rows[0].group_name.as_deref(), Some("DemoSection"));
    }

    #[test]
    fn repairs_unrecognized_quoted_identifier_split_by_comma() {
        let rows = parse_classroom_roster_rows(
            "identifier,github_username,github_id,name,group_name\n\
             “Lab 02, Student Beta”,beta-user-2,900000002,,DemoSection\n",
        )
        .expect("roster should parse");

        assert_eq!(rows[0].identifier, "Lab 02, Student Beta");
        assert_eq!(rows[0].github_username, "beta-user-2");
        assert_eq!(rows[0].github_id.as_deref(), Some("900000002"));
        assert_eq!(rows[0].name, "");
        assert_eq!(rows[0].group_name.as_deref(), Some("DemoSection"));
    }

    #[test]
    fn repairs_escaped_quotes_around_identifier() {
        let rows = parse_classroom_roster_rows(
            "identifier,github_username,github_id,name,group_name\n\
             \\\"Lab 03, Student Gamma\\\",gamma-user-3,900000003,Gray Example,DemoSection\n",
        )
        .expect("roster should parse");

        assert_eq!(rows[0].identifier, "Lab 03, Student Gamma");
        assert_eq!(rows[0].github_username, "gamma-user-3");
        assert_eq!(rows[0].github_id.as_deref(), Some("900000003"));
        assert_eq!(rows[0].name, "Gray Example");
        assert_eq!(rows[0].group_name.as_deref(), Some("DemoSection"));
    }

    #[test]
    fn repairs_dangling_quote_after_split_identifier() {
        let rows = parse_classroom_roster_rows(
            "identifier,github_username,github_id,name,group_name\n\
             Lab 04, Student Delta\\\",delta-user-4,900000004,Drew Example,DemoSection\n",
        )
        .expect("roster should parse");

        assert_eq!(rows[0].identifier, "Lab 04, Student Delta");
        assert_eq!(rows[0].github_username, "delta-user-4");
        assert_eq!(rows[0].github_id.as_deref(), Some("900000004"));
        assert_eq!(rows[0].name, "Drew Example");
        assert_eq!(rows[0].group_name.as_deref(), Some("DemoSection"));
    }
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

pub fn require_review_shas(repo: &Submission) -> AppResult<(String, String)> {
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
