mod commands;
mod db;
mod external;
mod models;
mod state;

use std::fs;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicI64};

use tauri::Manager;

use self::db::{init_db, open_conn};
use self::state::{AppContext, AppState};

pub type AppResult<T> = Result<T, String>;

fn setup_context<R: tauri::Runtime>(app: &tauri::App<R>) -> AppResult<AppContext> {
    let app_data_dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|err| err.to_string())?;
    let workspace_root = app_data_dir.join("workspaces");
    fs::create_dir_all(&workspace_root).map_err(|err| err.to_string())?;
    let db_path = app_data_dir.join("ezta.sqlite3");
    let ctx = AppContext {
        db_path,
        workspace_root,
    };
    let conn = open_conn(&ctx)?;
    init_db(&conn)?;
    Ok(ctx)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let ctx = setup_context(app)?;
            let conn = open_conn(&ctx)?;
            app.manage(AppState {
                ctx,
                db: std::sync::Mutex::new(conn),
                jobs: Arc::new(std::sync::Mutex::new(Vec::new())),
                next_job_id: Arc::new(AtomicI64::new(1)),
                update_in_progress: Arc::new(AtomicBool::new(false)),
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::github_commands::get_github_connection_status,
            commands::github_commands::launch_github_auth,
            commands::updater_commands::get_app_updater_overview,
            commands::updater_commands::check_for_app_update,
            commands::updater_commands::install_app_update,
            commands::assignment_commands::list_assignments,
            commands::github_commands::refresh_org_repo_index,
            commands::github_commands::discover_assignment_candidates,
            commands::github_commands::list_assignment_group_repos,
            commands::assignment_commands::create_assignment,
            commands::assignment_commands::update_assignment,
            commands::assignment_commands::delete_assignment,
            commands::assignment_commands::list_student_repos,
            commands::assignment_commands::create_student_repo,
            commands::assignment_commands::import_classroom_roster,
            commands::assignment_commands::update_student_repo,
            commands::assignment_commands::save_review_target,
            commands::assignment_commands::validate_review_target,
            commands::assignment_commands::list_commit_options,
            commands::review_commands::list_changed_files,
            commands::review_commands::get_file_content,
            commands::review_commands::get_file_diff,
            commands::review_commands::get_review_file_data,
            commands::review_commands::list_draft_comments,
            commands::review_commands::create_draft_comment,
            commands::review_commands::update_draft_comment,
            commands::review_commands::delete_draft_comment,
            commands::editor_commands::open_repo_in_editor,
            commands::editor_commands::open_file_in_editor,
            commands::review_commands::publish_draft_comments,
            commands::review_commands::submit_pending_review,
            commands::review_commands::discard_pending_review,
            commands::assignment_commands::sync_assignment_repos,
            commands::assignment_commands::prepare_review,
            commands::job_commands::list_background_jobs,
            commands::job_commands::get_background_job,
            commands::job_commands::dismiss_background_job,
            commands::job_commands::start_refresh_org_repo_index_job,
            commands::job_commands::start_sync_assignment_repos_job,
            commands::job_commands::start_prepare_review_job,
            commands::job_commands::start_publish_draft_comments_job,
            commands::job_commands::start_submit_pending_review_job,
            commands::job_commands::start_discard_pending_review_job,
            commands::data_commands::export_local_data,
            commands::data_commands::import_local_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
