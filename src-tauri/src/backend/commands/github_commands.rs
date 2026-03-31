use super::super::db::{
    fetch_org_repo_index_status, list_org_repo_index_group_repos, list_org_repo_index_groups,
    now_ts, open_conn, replace_org_repo_index,
};
use super::super::state::AppContext;
use super::super::external::{launch_github_auth_flow, try_command};
use super::super::models::{
    AssignmentDiscoveryGroup, AssignmentDiscoveryRepo, DiscoverAssignmentGroupReposInput,
    DiscoverAssignmentsInput, GithubConnectionStatus, OrgRepoIndexStatus,
    RefreshOrgRepoIndexInput,
};
use super::super::state::AppState;
use super::super::AppResult;
use super::support::{connected_status, fetch_org_repos_from_gh, with_db};

pub(crate) fn refresh_org_repo_index_inner(
    ctx: &AppContext,
    github_org: &str,
) -> AppResult<OrgRepoIndexStatus> {
    let github_org = github_org.trim().to_string();
    if github_org.is_empty() {
        return Err("github org is required for discovery".to_string());
    }
    let repos = fetch_org_repos_from_gh(&github_org)?;
    let fetched_at = now_ts();
    let conn = open_conn(ctx)?;
    replace_org_repo_index(&conn, &github_org, &repos, fetched_at)?;
    Ok(OrgRepoIndexStatus {
        github_org,
        repo_count: repos.len(),
        fetched_at,
    })
}

#[tauri::command]
pub fn get_github_connection_status() -> AppResult<GithubConnectionStatus> {
    let (git_installed, git_detail) = try_command("git", &["--version"], None);
    let (gh_installed, gh_detail) = try_command("gh", &["--version"], None);
    let git_version = git_detail
        .lines()
        .next()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);
    let gh_version = gh_detail
        .lines()
        .next()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);

    if !git_installed {
        return Ok(GithubConnectionStatus {
            git_installed: false,
            git_version,
            gh_installed,
            gh_version,
            gh_authenticated: false,
            github_login: None,
            status_summary: "Git is not installed or not available on PATH.".to_string(),
            detail: Some(git_detail),
        });
    }

    if !gh_installed {
        return Ok(GithubConnectionStatus {
            git_installed: true,
            git_version,
            gh_installed: false,
            gh_version,
            gh_authenticated: false,
            github_login: None,
            status_summary: "GitHub CLI is not installed or not available on PATH.".to_string(),
            detail: Some(gh_detail),
        });
    }

    let (gh_authenticated, auth_detail) =
        try_command("gh", &["auth", "status", "--hostname", "github.com"], None);
    if !gh_authenticated {
        return Ok(GithubConnectionStatus {
            git_installed: true,
            git_version,
            gh_installed: true,
            gh_version,
            gh_authenticated: false,
            github_login: None,
            status_summary: "GitHub CLI is installed, but GitHub is not authenticated yet."
                .to_string(),
            detail: Some(auth_detail),
        });
    }

    Ok(connected_status(git_version, gh_version, auth_detail))
}

#[tauri::command]
pub fn launch_github_auth() -> AppResult<()> {
    launch_github_auth_flow()
}

#[tauri::command]
pub async fn refresh_org_repo_index(
    input: RefreshOrgRepoIndexInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<OrgRepoIndexStatus> {
    let repos = tauri::async_runtime::spawn_blocking({
        let ctx = state.ctx.clone();
        let github_org = input.github_org.clone();
        move || refresh_org_repo_index_inner(&ctx, &github_org)
    })
    .await
    .map_err(|err| err.to_string())??;

    Ok(repos)
}

#[tauri::command]
pub async fn discover_assignment_candidates(
    input: DiscoverAssignmentsInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<Vec<AssignmentDiscoveryGroup>> {
    let status = with_db(&state, |conn| fetch_org_repo_index_status(conn, &input.github_org))?;
    if status.is_none() {
        return Err("org repo index is empty; refresh the index first".to_string());
    }
    with_db(&state, |conn| list_org_repo_index_groups(conn, &input.github_org))
}

#[tauri::command]
pub async fn list_assignment_group_repos(
    input: DiscoverAssignmentGroupReposInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<Vec<AssignmentDiscoveryRepo>> {
    if input.group_key.trim().is_empty() {
        return Err("group key is required".to_string());
    }
    let status = with_db(&state, |conn| fetch_org_repo_index_status(conn, &input.github_org))?;
    if status.is_none() {
        return Err("org repo index is empty; refresh the index first".to_string());
    }
    with_db(&state, |conn| {
        list_org_repo_index_group_repos(conn, &input.github_org, &input.group_key)
    })
}
