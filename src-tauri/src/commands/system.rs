use std::io::Read;
use std::process::{Child, Command};
use std::time::{Duration, Instant};
use tauri_plugin_dialog::DialogExt;

use crate::workspace;

const COMMAND_TIMEOUT: Duration = Duration::from_secs(120);
const MAX_OUTPUT_BYTES: u64 = 64 * 1024;

fn handle_timeout(child: &mut Child, start: Instant) -> Result<(), String> {
    if start.elapsed() > COMMAND_TIMEOUT {
        let _ = child.kill();
        return Err("命令执行超时（120 秒），已强制终止".to_string());
    }
    Ok(())
}

fn wait_for_child(child: &mut Child) -> Result<std::process::ExitStatus, String> {
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return Ok(status),
            Ok(None) => {
                handle_timeout(child, start)?;
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(e) => return Err(format!("等待命令失败: {e}")),
        }
    }
}

fn read_pipe(reader: Option<Box<dyn Read + Send>>) -> Result<String, String> {
    let mut buf = String::new();
    if let Some(reader) = reader {
        reader
            .take(MAX_OUTPUT_BYTES)
            .read_to_string(&mut buf)
            .map_err(|e| e.to_string())?;
    }
    Ok(buf)
}

#[tauri::command]
pub fn run_command(command: String) -> Result<String, String> {
    let root = workspace::get_root()
        .ok_or("尚未设置工作目录，请先在设置中选择工作目录")?;

    let shell = if cfg!(target_os = "windows") {
        "cmd"
    } else {
        "sh"
    };
    let flag = if cfg!(target_os = "windows") {
        "/C"
    } else {
        "-c"
    };

    let mut child = Command::new(shell)
        .args([flag, &command])
        .current_dir(&root)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("命令执行失败: {e}"))?;

    let status = wait_for_child(&mut child)?;

    let stdout = read_pipe(child.stdout.take().map(|r| Box::new(r) as Box<dyn Read + Send>))?;
    let stderr = read_pipe(child.stderr.take().map(|r| Box::new(r) as Box<dyn Read + Send>))?;

    let mut result = String::new();
    if !stdout.trim().is_empty() {
        result.push_str(stdout.trim());
    }
    if !stderr.trim().is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str(stderr.trim());
    }
    if !status.success() && result.is_empty() {
        result = format!("命令退出码: {}", status.code().unwrap_or(-1));
    }
    Ok(result)
}

#[tauri::command]
pub fn get_workspace_root() -> Result<Option<String>, String> {
    Ok(workspace::get_root().map(|p| p.display().to_string()))
}

#[tauri::command]
pub fn pick_workspace(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    let Some(path) = picked else {
        return Ok(None);
    };
    let Some(p) = path.as_path() else {
        return Ok(None);
    };
    let pb = p.to_path_buf();
    workspace::set_root(pb.clone());
    Ok(Some(pb.display().to_string()))
}

#[tauri::command]
pub fn set_workspace_root(path: String) -> Result<bool, String> {
    let pb = std::path::PathBuf::from(&path);
    if !pb.is_dir() {
        return Ok(false);
    }
    workspace::set_root(pb);
    Ok(true)
}
