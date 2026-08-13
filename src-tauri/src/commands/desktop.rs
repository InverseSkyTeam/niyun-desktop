#[derive(serde::Serialize)]
pub struct WindowInfo {
    pub title: String,
    pub process: String,
    pub class_name: String,
}

#[derive(serde::Serialize)]
pub struct DesktopInfo {
    foreground: Option<WindowInfo>,
    others: Vec<WindowInfo>,
    screen_w: i32,
    screen_h: i32,
    idle_seconds: u32,
    child_texts: Vec<String>,
}


#[cfg(windows)]
use super::win32::*;

#[cfg(windows)]
#[tauri::command]
pub fn get_cursor_pos() -> Result<(i32, i32), String> {
    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        if GetCursorPos(&mut point) != 0 {
            Ok((point.x, point.y))
        } else {
            Err("GetCursorPos failed".to_string())
        }
    }
}

#[cfg(windows)]
unsafe fn read_foreground_window(fg: HWND) -> Option<WindowInfo> {
    let info = read_window_info(fg);
    if info.title.is_empty() && info.process.is_empty() {
        None
    } else {
        Some(info)
    }
}

#[cfg(windows)]
unsafe fn read_child_texts(fg: HWND) -> Vec<String> {
    let mut collector = ChildTextCollector { texts: Vec::new() };
    EnumChildWindows(
        fg,
        enum_child_window_callback,
        &mut collector as *mut _ as LPARAM,
    );
    collector.texts
}

#[cfg(windows)]
unsafe fn collect_other_windows(fg: HWND) -> Vec<WindowInfo> {
    let mut collector = WindowCollector {
        foreground_hwnd: fg,
        others: Vec::new(),
    };
    EnumWindows(enum_window_callback, &mut collector as *mut _ as LPARAM);
    collector.others
}

#[cfg(windows)]
#[tauri::command]
pub fn get_desktop_info() -> Result<DesktopInfo, String> {
    unsafe {
        let fg = GetForegroundWindow();
        let foreground = if fg.is_null() {
            None
        } else {
            read_foreground_window(fg)
        };
        let child_texts = if fg.is_null() {
            Vec::new()
        } else {
            read_child_texts(fg)
        };
        Ok(DesktopInfo {
            foreground,
            others: collect_other_windows(fg),
            screen_w: GetSystemMetrics(0),
            screen_h: GetSystemMetrics(1),
            idle_seconds: get_idle_seconds(),
            child_texts,
        })
    }
}


#[cfg(target_os = "macos")]
fn read_macos_foreground() -> Option<WindowInfo> {
    use std::process::Command;

    let script = "tell application \"System Events\"
        set appName to name of first application process whose frontmost is true
        set winTitle to \"\"
        try
            set winTitle to title of first window of (first application process whose frontmost is true)
        end try
        return appName & \"|||\" & winTitle
    end tell";
    let out = Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let mut parts = text.splitn(2, "|||");
    let proc = parts.next()?.to_string();
    let title = parts.next().unwrap_or("").to_string();
    Some(WindowInfo {
        title,
        process: proc,
        class_name: String::new(),
    })
}

#[cfg(target_os = "macos")]
fn read_macos_screen_size() -> Option<(i32, i32)> {
    use std::process::Command;

    let script = "tell application \"Finder\" to get bounds of window of desktop";
    let out = Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let parts: Vec<&str> = text.split(", ").collect();
    if parts.len() == 4 {
        Some((parts[2].trim().parse().ok()?, parts[3].trim().parse().ok()?))
    } else {
        None
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn get_desktop_info() -> Result<DesktopInfo, String> {
    let (screen_w, screen_h) = read_macos_screen_size().unwrap_or((0, 0));
    Ok(DesktopInfo {
        foreground: read_macos_foreground(),
        others: vec![],
        screen_w,
        screen_h,
        idle_seconds: 0,
        child_texts: vec![],
    })
}


#[cfg(target_os = "linux")]
fn read_linux_foreground() -> Option<WindowInfo> {
    use std::process::Command;

    let title_out = Command::new("xdotool")
        .args(["getactivewindow", "getwindowname"])
        .output()
        .ok()?;
    if !title_out.status.success() {
        return None;
    }
    let title = String::from_utf8_lossy(&title_out.stdout)
        .trim()
        .to_string();

    let pid_out = Command::new("xdotool")
        .args(["getactivewindow", "getwindowpid"])
        .output()
        .ok()?;
    if !pid_out.status.success() {
        return None;
    }
    let pid = String::from_utf8_lossy(&pid_out.stdout).trim().to_string();

    let proc_out = Command::new("ps")
        .args(["-p", &pid, "-o", "comm="])
        .output()
        .ok()?;
    if !proc_out.status.success() {
        return None;
    }
    let process = String::from_utf8_lossy(&proc_out.stdout).trim().to_string();

    Some(WindowInfo {
        title,
        process,
        class_name: String::new(),
    })
}

#[cfg(target_os = "linux")]
fn read_linux_screen_size() -> Option<(i32, i32)> {
    use std::process::Command;

    let out = Command::new("xrandr").output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        if line.contains('*') {
            let res = line.trim().split_whitespace().next()?;
            let mut dims = res.split('x');
            let w = dims.next()?.parse().ok()?;
            let h = dims.next()?.parse().ok()?;
            return Some((w, h));
        }
    }
    None
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub fn get_desktop_info() -> Result<DesktopInfo, String> {
    let (screen_w, screen_h) = read_linux_screen_size().unwrap_or((0, 0));
    Ok(DesktopInfo {
        foreground: read_linux_foreground(),
        others: vec![],
        screen_w,
        screen_h,
        idle_seconds: 0,
        child_texts: vec![],
    })
}


#[cfg(not(windows))]
#[tauri::command]
pub fn get_cursor_pos() -> Result<(i32, i32), String> {
    Err("Not supported on this platform".to_string())
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
#[tauri::command]
pub fn get_desktop_info() -> Result<DesktopInfo, String> {
    Err("Not supported on this platform".to_string())
}
