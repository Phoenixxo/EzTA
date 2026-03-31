use std::sync::atomic::Ordering;

use tauri::{AppHandle, Url};
use tauri_plugin_updater::UpdaterExt;

use super::super::models::{
    AppUpdateCheckResult, AppUpdateInstallResult, AppUpdaterConfigInput, AppUpdaterOverview,
};
use super::super::state::AppState;
use super::super::AppResult;

fn validate_updater_config(input: &AppUpdaterConfigInput) -> AppResult<(Url, String)> {
    let endpoint = input.endpoint.trim().to_string();
    let pubkey = input.pubkey.trim().to_string();

    if endpoint.is_empty() {
        return Err("updater endpoint is required".to_string());
    }
    if pubkey.is_empty() {
        return Err("updater public key is required".to_string());
    }

    let endpoint = Url::parse(&endpoint).map_err(|err| format!("invalid updater endpoint: {}", err))?;

    Ok((endpoint, pubkey))
}

#[tauri::command]
pub fn get_app_updater_overview(app: AppHandle) -> AppUpdaterOverview {
    AppUpdaterOverview {
        current_version: app.package_info().version.to_string(),
    }
}

#[tauri::command]
pub async fn check_for_app_update(
    app: AppHandle,
    input: AppUpdaterConfigInput,
) -> AppResult<AppUpdateCheckResult> {
    let (endpoint, pubkey) = validate_updater_config(&input)?;
    let current_version = app.package_info().version.to_string();

    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|err| err.to_string())?
        .pubkey(pubkey)
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
    input: AppUpdaterConfigInput,
    state: tauri::State<'_, AppState>,
) -> AppResult<AppUpdateInstallResult> {
    let (endpoint, pubkey) = validate_updater_config(&input)?;

    if state
        .update_in_progress
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("an update install is already in progress".to_string());
    }

    let updater = match app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|err| err.to_string())?
        .pubkey(pubkey)
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
