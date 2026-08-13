use std::fs;
use crate::workspace;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let full = workspace::resolve_in_workspace(&path)?;
    if !full.is_file() {
        return Err("目标不是文件或不存在".to_string());
    }
    fs::read_to_string(&full).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<String, String> {
    let full = workspace::resolve_in_workspace(&path)?;
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let len = content.len();
    fs::write(&full, &content).map_err(|e| e.to_string())?;
    Ok(format!("已写入 {} 字节", len))
}

fn read_entry(entry: Result<fs::DirEntry, std::io::Error>) -> Option<serde_json::Value> {
    let e = entry.ok()?;
    let ft = e.file_type().ok()?;
    let meta = e.metadata().ok()?;
    Some(serde_json::json!({
        "name": e.file_name().to_string_lossy(),
        "is_dir": ft.is_dir(),
        "size": meta.len(),
    }))
}

fn sort_entries(entries: &mut [serde_json::Value]) {
    entries.sort_by(|a, b| {
        let a_dir = a["is_dir"].as_bool().unwrap_or(false);
        let b_dir = b["is_dir"].as_bool().unwrap_or(false);
        if a_dir != b_dir {
            b_dir.cmp(&a_dir)
        } else {
            a["name"]
                .as_str()
                .unwrap_or("")
                .cmp(b["name"].as_str().unwrap_or(""))
        }
    });
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<serde_json::Value>, String> {
    let full = workspace::resolve_in_workspace(&path)?;
    if !full.is_dir() {
        return Err("目标不是目录".to_string());
    }
    let mut entries: Vec<serde_json::Value> = fs::read_dir(&full)
        .map_err(|e| e.to_string())?
        .filter_map(read_entry)
        .collect();
    sort_entries(&mut entries);
    Ok(entries)
}
