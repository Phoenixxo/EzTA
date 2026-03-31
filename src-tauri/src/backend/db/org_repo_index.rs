use rusqlite::{params, Connection, OptionalExtension};

use super::super::models::{AssignmentDiscoveryGroup, AssignmentDiscoveryRepo, GhApiRepo, OrgRepoIndexStatus};
use super::super::AppResult;

pub fn replace_org_repo_index(
    conn: &Connection,
    github_org: &str,
    repos: &[GhApiRepo],
    fetched_at: i64,
) -> AppResult<()> {
    let tx = conn.unchecked_transaction().map_err(|err| err.to_string())?;
    tx.execute(
        "DELETE FROM org_repo_index WHERE github_org = ?1",
        [github_org.trim()],
    )
    .map_err(|err| err.to_string())?;

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO org_repo_index (github_org, repo_name, repo_url, fetched_at)
                 VALUES (?1, ?2, ?3, ?4)",
            )
            .map_err(|err| err.to_string())?;

        for repo in repos {
            stmt.execute(params![github_org.trim(), repo.name, repo.url, fetched_at])
                .map_err(|err| err.to_string())?;
        }
    }

    tx.commit().map_err(|err| err.to_string())?;
    Ok(())
}

pub fn fetch_org_repo_index_status(conn: &Connection, github_org: &str) -> AppResult<Option<OrgRepoIndexStatus>> {
    let mut stmt = conn
        .prepare(
            "SELECT github_org, COUNT(*) AS repo_count, MAX(fetched_at) AS fetched_at
             FROM org_repo_index
             WHERE github_org = ?1
             GROUP BY github_org",
        )
        .map_err(|err| err.to_string())?;

    let status = stmt
        .query_row([github_org.trim()], |row| {
            Ok(OrgRepoIndexStatus {
                github_org: row.get("github_org")?,
                repo_count: row.get::<_, i64>("repo_count")? as usize,
                fetched_at: row.get("fetched_at")?,
            })
        })
        .optional()
        .map_err(|err| err.to_string())?;

    Ok(status)
}

pub fn list_org_repo_index_groups(conn: &Connection, github_org: &str) -> AppResult<Vec<AssignmentDiscoveryGroup>> {
    let mut stmt = conn
        .prepare(
            "SELECT repo_name FROM org_repo_index
             WHERE github_org = ?1
             ORDER BY repo_name COLLATE NOCASE ASC",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([github_org.trim()], |row| row.get::<_, String>(0))
        .map_err(|err| err.to_string())?;

    let mut grouped: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    for row in rows {
        let repo_name = row.map_err(|err| err.to_string())?;
        if let Some(dash_index) = repo_name.rfind('-') {
            if dash_index > 0 && dash_index < repo_name.len() - 1 {
                let prefix = repo_name[..dash_index].trim_matches('-').to_string();
                if !prefix.is_empty() {
                    grouped.entry(prefix).or_default().push(repo_name);
                }
            }
        }
    }

    let mut groups = grouped
        .into_iter()
        .filter_map(|(group_key, mut repo_names)| {
            if repo_names.len() < 3 {
                return None;
            }
            repo_names.sort();
            Some(AssignmentDiscoveryGroup {
                group_key,
                github_org: github_org.trim().to_string(),
                repo_count: repo_names.len(),
                examples: repo_names.into_iter().take(3).collect(),
            })
        })
        .collect::<Vec<_>>();

    groups.sort_by(|left, right| {
        right
            .repo_count
            .cmp(&left.repo_count)
            .then_with(|| left.group_key.cmp(&right.group_key))
    });
    Ok(groups)
}

pub fn list_org_repo_index_group_repos(
    conn: &Connection,
    github_org: &str,
    group_key: &str,
) -> AppResult<Vec<AssignmentDiscoveryRepo>> {
    let prefix = format!("{}-", group_key.trim());
    let mut stmt = conn
        .prepare(
            "SELECT repo_name, repo_url FROM org_repo_index
             WHERE github_org = ?1 AND repo_name LIKE ?2
             ORDER BY repo_name COLLATE NOCASE ASC",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![github_org.trim(), format!("{prefix}%")], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|err| err.to_string())?;

    let mut repos = Vec::new();
    for row in rows {
        let (repo_name, repo_url) = row.map_err(|err| err.to_string())?;
        let student_suffix = repo_name
            .strip_prefix(&prefix)
            .unwrap_or("")
            .trim()
            .to_string();
        if student_suffix.is_empty() {
            continue;
        }
        repos.push(AssignmentDiscoveryRepo {
            repo_name,
            repo_url,
            student_suffix,
        });
    }
    Ok(repos)
}
