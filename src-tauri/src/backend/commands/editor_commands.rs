use std::path::PathBuf;

use super::super::db::fetch_submission;
use super::super::external::{
    ensure_submission_worktree, open_external_url, open_path_in_editor,
};
use super::super::models::{OpenExternalUrlInput, OpenFileInEditorInput, OpenInEditorInput};
use super::super::state::AppState;
use super::super::AppResult;
use super::support::with_db;

#[tauri::command]
pub fn open_repo_in_editor(
    input: OpenInEditorInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<()> {
    let repo = with_db(&state, |conn| fetch_submission(conn, input.student_repo_id))?;
    let repo_path = ensure_submission_worktree(&repo)?;
    open_path_in_editor(&repo_path, input.editor_command.as_deref())
}

#[tauri::command]
pub fn open_file_in_editor(
    input: OpenFileInEditorInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<()> {
    let repo = with_db(&state, |conn| fetch_submission(conn, input.student_repo_id))?;
    let repo_path = ensure_submission_worktree(&repo)?;
    let target_path = PathBuf::from(&repo_path).join(input.file_path.trim());
    if !target_path.exists() {
        return Err(
            "file does not exist in the saved submission snapshot for this repository".to_string(),
        );
    }
    open_path_in_editor(&target_path, input.editor_command.as_deref())
}

#[tauri::command]
pub fn open_external_link(input: OpenExternalUrlInput) -> AppResult<()> {
    open_external_url(&input.url)
}
