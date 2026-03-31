use chrono::{DateTime, Utc};
use serde::de::DeserializeOwned;
use serde_json::json;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use super::db::parse_rfc3339_utc;
use super::models::{Assignment, ClassroomRosterRow, DraftComment, GhPendingReview, GhPr, GhPushEvent, StudentRepo};
use super::AppResult;

fn configured_path() -> String {
    let path = env::var_os("PATH")
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();

    let mut segments = vec![
        "/opt/homebrew/bin".to_string(),
        "/usr/local/bin".to_string(),
        "/usr/bin".to_string(),
        "/bin".to_string(),
        "/usr/sbin".to_string(),
        "/sbin".to_string(),
    ];

    for segment in path.split(':').filter(|segment| !segment.is_empty()) {
        if !segments.iter().any(|existing| existing == segment) {
            segments.push(segment.to_string());
        }
    }

    segments.join(":")
}

fn apply_command_environment(command: &mut Command) {
    command.env("PATH", configured_path());
}

pub fn run_command(program: &str, args: &[&str], cwd: Option<&Path>) -> AppResult<String> {
    let mut command = Command::new(program);
    command.args(args);
    apply_command_environment(&mut command);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    let output = command
        .output()
        .map_err(|err| format!("failed to run {}: {}", program, err))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        Err(format!("{} {} failed: {}", program, args.join(" "), detail))
    }
}

pub fn run_json_command<T: DeserializeOwned>(
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
) -> AppResult<T> {
    let output = run_command(program, args, cwd)?;
    serde_json::from_str(&output).map_err(|err| err.to_string())
}

pub fn try_command(program: &str, args: &[&str], cwd: Option<&Path>) -> (bool, String) {
    let mut command = Command::new(program);
    command.args(args);
    apply_command_environment(&mut command);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    match command.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let detail = if stderr.is_empty() { stdout } else { stderr };
            (output.status.success(), detail)
        }
        Err(err) => (false, err.to_string()),
    }
}

pub fn run_json_command_with_json_input<T: DeserializeOwned>(
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
    input: &serde_json::Value,
) -> AppResult<T> {
    let mut command = Command::new(program);
    command.args(args).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    apply_command_environment(&mut command);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    let mut child = command
        .spawn()
        .map_err(|err| format!("failed to run {}: {}", program, err))?;
    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        let body = serde_json::to_vec(input).map_err(|err| err.to_string())?;
        stdin.write_all(&body).map_err(|err| err.to_string())?;
    }
    let output = child.wait_with_output().map_err(|err| err.to_string())?;
    if output.status.success() {
        serde_json::from_str(String::from_utf8_lossy(&output.stdout).trim()).map_err(|err| err.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        Err(format!("{} {} failed: {}", program, args.join(" "), detail))
    }
}

pub fn ensure_local_repo(repo: &StudentRepo) -> AppResult<()> {
    let local_path = PathBuf::from(&repo.local_path);
    if local_path.join(".git").exists() {
        run_command("git", &["fetch", "origin", "--prune"], Some(&local_path))?;
        return Ok(());
    }

    if let Some(parent) = local_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    run_command(
        "gh",
        &[
            "repo",
            "clone",
            &format!("{}/{}", repo.repo_owner, repo.repo_name),
            &repo.local_path,
        ],
        None,
    )?;
    Ok(())
}

pub fn require_local_repo(repo: &StudentRepo) -> AppResult<PathBuf> {
    let local_path = PathBuf::from(&repo.local_path);
    if local_path.join(".git").exists() {
        return Ok(local_path);
    }
    Err(format!(
        "local clone is missing for {}/{}. Prepare or sync the repository first.",
        repo.repo_owner, repo.repo_name
    ))
}

pub fn commit_exists(repo_path: &Path, sha: &str) -> bool {
    run_command("git", &["rev-parse", "--verify", &format!("{sha}^{{commit}}")], Some(repo_path))
        .is_ok()
}

pub fn find_deadline_submission_from_push_events(
    repo: &StudentRepo,
    deadline_at: &str,
) -> AppResult<Option<(String, String)>> {
    let deadline = parse_rfc3339_utc(deadline_at)?;
    let events: Vec<GhPushEvent> = run_json_command(
        "gh",
        &[
            "api",
            &format!("repos/{}/{}/events?per_page=100", repo.repo_owner, repo.repo_name),
        ],
        None,
    )?;

    let mut best: Option<(DateTime<Utc>, String, String)> = None;
    for event in events {
        if event.event_type != "PushEvent" {
            continue;
        }
        let head = match event.payload.head {
            Some(head) if !head.trim().is_empty() => head,
            _ => continue,
        };
        let created_at = parse_rfc3339_utc(&event.created_at)?;
        if created_at > deadline {
            continue;
        }
        match &best {
            Some((best_created_at, _, _)) if created_at <= *best_created_at => {}
            _ => best = Some((created_at, head, event.created_at)),
        }
    }

    Ok(best.map(|(_, sha, event_at)| (sha, event_at)))
}

pub fn apply_repo_template(assignment: &Assignment, template: &str, row: &ClassroomRosterRow) -> String {
    template
        .replace("{assignment_name}", assignment.name.trim())
        .replace("{identifier}", row.identifier.trim())
        .replace("{github_username}", row.github_username.trim())
        .replace("{name}", row.name.trim())
        .replace("{group_name}", row.group_name.as_deref().unwrap_or("").trim())
}

pub fn should_include_roster_row(_assignment: &Assignment, _row: &ClassroomRosterRow) -> bool {
    true
}

pub fn launch_github_auth_flow() -> AppResult<()> {
    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args([
                "-e",
                "tell application \"Terminal\" to activate",
                "-e",
                "tell application \"Terminal\" to do script \"gh auth login\"",
            ])
            .spawn()
            .map_err(|err| format!("failed to launch GitHub auth in Terminal: {}", err))?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("x-terminal-emulator")
            .args(["-e", "sh", "-lc", "gh auth login"])
            .spawn()
            .map_err(|err| format!("failed to launch GitHub auth in terminal: {}", err))?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", "gh auth login"])
            .spawn()
            .map_err(|err| format!("failed to launch GitHub auth terminal: {}", err))?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err("unsupported platform for launching GitHub auth".to_string())
}

pub fn fetch_existing_pr(repo: &StudentRepo, base_branch: &str, head_branch: &str) -> AppResult<Option<GhPr>> {
    let prs: Vec<GhPr> = run_json_command(
        "gh",
        &[
            "pr",
            "list",
            "--repo",
            &format!("{}/{}", repo.repo_owner, repo.repo_name),
            "--state",
            "open",
            "--base",
            base_branch,
            "--head",
            head_branch,
            "--json",
            "number,url",
            "--limit",
            "1",
        ],
        None,
    )?;
    Ok(prs.into_iter().next())
}

pub fn create_pending_pr_review(
    repo: &StudentRepo,
    pr_number: i64,
    commit_id: &str,
    comments: &[DraftComment],
) -> AppResult<GhPendingReview> {
    let review_comments = comments
        .iter()
        .map(|draft| {
            let side = if draft.side.eq_ignore_ascii_case("base") {
                "LEFT"
            } else {
                "RIGHT"
            };
            let mut comment = json!({
                "path": draft.file_path,
                "body": draft.body,
                "side": side,
                "line": draft.line_number,
            });
            if draft.start_line != draft.line_number {
                comment["start_line"] = json!(draft.start_line);
                comment["start_side"] = json!(side);
            }
            comment
        })
        .collect::<Vec<_>>();

    let endpoint = format!(
        "repos/{}/{}/pulls/{}/reviews",
        repo.repo_owner, repo.repo_name, pr_number
    );
    let payload = json!({
        "commit_id": commit_id,
        "body": "",
        "comments": review_comments,
    });
    run_json_command_with_json_input("gh", &["api", "-X", "POST", &endpoint, "--input", "-"], None, &payload)
}

pub fn submit_pending_pr_review(
    repo: &StudentRepo,
    pr_number: i64,
    review_id: i64,
    event: &str,
    body: Option<&str>,
) -> AppResult<GhPendingReview> {
    let endpoint = format!(
        "repos/{}/{}/pulls/{}/reviews/{}/events",
        repo.repo_owner, repo.repo_name, pr_number, review_id
    );
    let payload = json!({
        "event": event,
        "body": body.unwrap_or(""),
    });
    run_json_command_with_json_input("gh", &["api", "-X", "POST", &endpoint, "--input", "-"], None, &payload)
}

pub fn discard_pending_pr_review(
    repo: &StudentRepo,
    pr_number: i64,
    review_id: i64,
) -> AppResult<()> {
    let endpoint = format!(
        "repos/{}/{}/pulls/{}/reviews/{}",
        repo.repo_owner, repo.repo_name, pr_number, review_id
    );
    run_command("gh", &["api", "-X", "DELETE", &endpoint], None)?;
    Ok(())
}

pub fn open_path_in_editor(path: &Path, editor_command: Option<&str>) -> AppResult<()> {
    if let Some(command) = editor_command.map(str::trim).filter(|value| !value.is_empty()) {
        let parts = command.split_whitespace().collect::<Vec<_>>();
        let Some((program, args)) = parts.split_first() else {
            return Err("editor command is empty".to_string());
        };
        let mut process = Command::new(program);
        process.args(args).arg(path);
        process
            .spawn()
            .map_err(|err| format!("failed to open editor {}: {}", command, err))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|err| format!("failed to open path: {}", err))?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|err| format!("failed to open path: {}", err))?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path.to_string_lossy()])
            .spawn()
            .map_err(|err| format!("failed to open path: {}", err))?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err("unsupported platform for opening editor".to_string())
}
