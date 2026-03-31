use serde::Serialize;
use serde_json::to_value;
use std::sync::atomic::Ordering;

use super::super::models::{
    BackgroundJob, RefreshOrgRepoIndexInput, SubmitPendingReviewInput,
};
use super::super::state::AppState;
use super::super::AppResult;
use super::assignment_commands::{prepare_review_inner, sync_assignment_repos_inner};
use super::github_commands::refresh_org_repo_index_inner;
use super::review_commands::{
    discard_pending_review_inner, publish_draft_comments_inner, submit_pending_review_inner,
};

#[tauri::command]
pub fn list_background_jobs(state: tauri::State<'_, AppState>) -> AppResult<Vec<BackgroundJob>> {
    let jobs = state.jobs.lock().map_err(|err| err.to_string())?;
    Ok(jobs.clone())
}

#[tauri::command]
pub fn get_background_job(
    job_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<Option<BackgroundJob>> {
    let jobs = state.jobs.lock().map_err(|err| err.to_string())?;
    Ok(jobs.iter().find(|job| job.id == job_id).cloned())
}

#[tauri::command]
pub fn dismiss_background_job(job_id: i64, state: tauri::State<'_, AppState>) -> AppResult<()> {
    let mut jobs = state.jobs.lock().map_err(|err| err.to_string())?;
    jobs.retain(|job| job.id != job_id);
    Ok(())
}

#[tauri::command]
pub fn start_refresh_org_repo_index_job(
    input: RefreshOrgRepoIndexInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<BackgroundJob> {
    Ok(spawn_job(
        &state,
        "refresh_org_repo_index",
        format!("Refresh org index: {}", input.github_org.trim()),
        "Queued org index refresh.",
        move |ctx| refresh_org_repo_index_inner(&ctx, &input.github_org),
    ))
}

#[tauri::command]
pub fn start_sync_assignment_repos_job(
    assignment_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<BackgroundJob> {
    Ok(spawn_job(
        &state,
        "sync_assignment_repos",
        format!("Sync assignment {}", assignment_id),
        "Queued repository sync.",
        move |ctx| sync_assignment_repos_inner(&ctx, assignment_id),
    ))
}

#[tauri::command]
pub fn start_prepare_review_job(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<BackgroundJob> {
    Ok(spawn_job(
        &state,
        "prepare_review",
        format!("Prepare review {}", student_repo_id),
        "Queued PR preparation.",
        move |ctx| prepare_review_inner(&ctx, student_repo_id),
    ))
}

#[tauri::command]
pub fn start_publish_draft_comments_job(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<BackgroundJob> {
    Ok(spawn_job(
        &state,
        "publish_draft_comments",
        format!("Queue pending review {}", student_repo_id),
        "Queued draft comment publish.",
        move |ctx| publish_draft_comments_inner(&ctx, student_repo_id),
    ))
}

#[tauri::command]
pub fn start_submit_pending_review_job(
    input: SubmitPendingReviewInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<BackgroundJob> {
    Ok(spawn_job(
        &state,
        "submit_pending_review",
        format!("Submit pending review {}", input.student_repo_id),
        "Queued pending review submission.",
        move |ctx| submit_pending_review_inner(&ctx, input),
    ))
}

#[tauri::command]
pub fn start_discard_pending_review_job(
    student_repo_id: i64,
    state: tauri::State<'_, AppState>,
) -> AppResult<BackgroundJob> {
    Ok(spawn_job(
        &state,
        "discard_pending_review",
        format!("Discard pending review {}", student_repo_id),
        "Queued pending review discard.",
        move |ctx| discard_pending_review_inner(&ctx, student_repo_id),
    ))
}

fn spawn_job<T>(
    state: &tauri::State<'_, AppState>,
    kind: &str,
    label: String,
    queued_message: &str,
    task: impl FnOnce(super::super::state::AppContext) -> AppResult<T> + Send + 'static,
) -> BackgroundJob
where
    T: Serialize + Send + 'static,
{
    let id = state.next_job_id.fetch_add(1, Ordering::Relaxed);
    let created_at = super::super::db::now_ts();
    let job = BackgroundJob {
        id,
        kind: kind.to_string(),
        label,
        status: "queued".to_string(),
        message: queued_message.to_string(),
        created_at,
        started_at: None,
        finished_at: None,
        error: None,
        result: None,
    };

    {
        let mut jobs = state.jobs.lock().expect("background jobs lock poisoned");
        jobs.insert(0, job.clone());
        if jobs.len() > 40 {
            jobs.truncate(40);
        }
    }

    let jobs = state.jobs.clone();
    let ctx = state.ctx.clone();

    tauri::async_runtime::spawn(async move {
        update_job(&jobs, id, |job| {
            job.status = "running".to_string();
            job.started_at = Some(super::super::db::now_ts());
            job.message = "Running...".to_string();
        });

        let result = tauri::async_runtime::spawn_blocking(move || task(ctx)).await;
        match result {
            Ok(Ok(output)) => {
                let finished_at = super::super::db::now_ts();
                update_job(&jobs, id, |job| {
                    job.status = "succeeded".to_string();
                    job.finished_at = Some(finished_at);
                    job.message = "Completed.".to_string();
                    job.result = to_value(output).ok();
                });
            }
            Ok(Err(err)) => {
                let finished_at = super::super::db::now_ts();
                update_job(&jobs, id, |job| {
                    job.status = "failed".to_string();
                    job.finished_at = Some(finished_at);
                    job.message = "Failed.".to_string();
                    job.error = Some(err);
                });
            }
            Err(err) => {
                let finished_at = super::super::db::now_ts();
                update_job(&jobs, id, |job| {
                    job.status = "failed".to_string();
                    job.finished_at = Some(finished_at);
                    job.message = "Failed.".to_string();
                    job.error = Some(err.to_string());
                });
            }
        }
    });

    job
}

fn update_job(
    jobs: &std::sync::Arc<std::sync::Mutex<Vec<BackgroundJob>>>,
    job_id: i64,
    f: impl FnOnce(&mut BackgroundJob),
) {
    if let Ok(mut locked) = jobs.lock() {
        if let Some(job) = locked.iter_mut().find(|job| job.id == job_id) {
            f(job);
        }
    }
}
