use chrono::{DateTime, Utc};
use std::time::{SystemTime, UNIX_EPOCH};

use super::super::AppResult;

pub fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn normalize_deadline(deadline_at: Option<String>) -> AppResult<Option<String>> {
    match deadline_at {
        Some(value) if !value.trim().is_empty() => {
            let parsed = DateTime::parse_from_rfc3339(value.trim())
                .map_err(|err| format!("invalid deadline timestamp: {}", err))?;
            Ok(Some(parsed.with_timezone(&Utc).to_rfc3339()))
        }
        _ => Ok(None),
    }
}

pub fn parse_rfc3339_utc(value: &str) -> AppResult<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|err| format!("invalid RFC3339 timestamp {}: {}", value, err))
}

pub fn slugify(input: &str) -> String {
    let mut slug = String::new();
    let mut prev_dash = false;
    for ch in input.chars() {
        let lower = ch.to_ascii_lowercase();
        if lower.is_ascii_alphanumeric() {
            slug.push(lower);
            prev_dash = false;
        } else if !prev_dash {
            slug.push('-');
            prev_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}
