use std::sync::atomic::Ordering;

use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

use super::super::models::{AppUpdateCheckResult, AppUpdateInstallResult, AppUpdaterOverview};
use super::super::state::AppState;
use super::super::AppResult;

#[tauri::command]
pub fn get_app_updater_overview(app: AppHandle) -> AppUpdaterOverview {
    AppUpdaterOverview {
        current_version: app.package_info().version.to_string(),
    }
}

#[tauri::command]
pub async fn check_for_app_update(app: AppHandle) -> AppResult<AppUpdateCheckResult> {
    let current_version = app.package_info().version.to_string();

    let updater = app
        .updater_builder()
        .build()
        .map_err(|err| err.to_string())?;

    let Some(update) = updater.check().await.map_err(|err| err.to_string())? else {
        return Ok(AppUpdateCheckResult {
            current_version,
            available: false,
            version: None,
            date: None,
            body: None,
        });
    };

    Ok(AppUpdateCheckResult {
        current_version,
        available: true,
        version: Some(update.version.clone()),
        date: update.date.map(|value| value.to_string()),
        body: update.body.clone(),
    })
}

#[tauri::command]
pub async fn install_app_update(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<AppUpdateInstallResult> {
    if state
        .update_in_progress
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("an update install is already in progress".to_string());
    }

    let updater = match app
        .updater_builder()
        .build()
        .map_err(|err| err.to_string())
    {
        Ok(updater) => updater,
        Err(err) => {
            state.update_in_progress.store(false, Ordering::SeqCst);
            return Err(err);
        }
    };

    let result = async {
        let Some(update) = updater.check().await.map_err(|err| err.to_string())? else {
            return Err("no update is currently available".to_string());
        };

        let installed_version = update.version.clone();
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|err| err.to_string())?;

        Ok::<AppUpdateInstallResult, String>(AppUpdateInstallResult {
            installed_version,
            restarted: true,
        })
    }
    .await;

    state.update_in_progress.store(false, Ordering::SeqCst);

    match result {
        Ok(result) => {
            app.request_restart();
            Ok(result)
        }
        Err(err) => Err(err),
    }
}
