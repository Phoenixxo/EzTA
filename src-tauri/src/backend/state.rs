use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::sync::atomic::AtomicI64;
use std::sync::atomic::AtomicBool;

use super::models::BackgroundJob;

#[derive(Clone)]
pub struct AppContext {
    pub db_path: PathBuf,
    pub workspace_root: PathBuf,
}

pub struct AppState {
    pub ctx: AppContext,
    pub db: Mutex<Connection>,
    pub jobs: Arc<Mutex<Vec<BackgroundJob>>>,
    pub next_job_id: Arc<AtomicI64>,
    pub update_in_progress: Arc<AtomicBool>,
}
