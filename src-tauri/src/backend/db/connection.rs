use rusqlite::Connection;

use super::super::state::{AppContext, AppState};
use super::super::AppResult;

pub fn open_conn(ctx: &AppContext) -> AppResult<Connection> {
    let conn = Connection::open(&ctx.db_path).map_err(|err| err.to_string())?;
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        PRAGMA synchronous = NORMAL;
        ",
    )
    .map_err(|err| err.to_string())?;
    Ok(conn)
}

pub fn with_conn<T>(
    state: &tauri::State<'_, AppState>,
    f: impl FnOnce(&Connection) -> AppResult<T>,
) -> AppResult<T> {
    let conn = state.db.lock().map_err(|err| err.to_string())?;
    f(&conn)
}
