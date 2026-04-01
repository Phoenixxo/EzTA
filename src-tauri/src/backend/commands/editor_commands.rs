use std::path::PathBuf;

use super::super::db::fetch_student_repo;
use super::super::external::{ensure_local_repo, open_external_url, open_path_in_editor};
use super::super::models::{OpenExternalUrlInput, OpenFileInEditorInput, OpenInEditorInput};
use super::super::state::AppState;
use super::super::AppResult;
use super::support::with_db;

#[tauri::command]
pub fn open_repo_in_editor(
    input: OpenInEditorInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<()> {
    let repo = with_db(&state, |conn| fetch_student_repo(conn, input.student_repo_id))?;
    ensure_local_repo(&repo)?;
    let repo_path = PathBuf::from(&repo.local_path);
    open_path_in_editor(&repo_path, input.editor_command.as_deref())
}

#[tauri::command]
pub fn open_file_in_editor(
    input: OpenFileInEditorInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<()> {
    let repo = with_db(&state, |conn| fetch_student_repo(conn, input.student_repo_id))?;
    ensure_local_repo(&repo)?;
    let target_path = PathBuf::from(&repo.local_path).join(input.file_path.trim());
    if !target_path.exists() {
        return Err("file does not exist in the local working tree for this repo".to_string());
    }
    open_path_in_editor(&target_path, input.editor_command.as_deref())
}

#[tauri::command]
pub fn open_external_link(input: OpenExternalUrlInput) -> AppResult<()> {
    open_external_url(&input.url)
}
