#[derive(serde::Serialize)]
struct WindowInfo {
    title: String,
    process: String,
    class_name: String,
}

#[derive(serde::Serialize)]
struct DesktopInfo {
    foreground: Option<WindowInfo>,
    others: Vec<WindowInfo>,
    screen_w: i32,
    screen_h: i32,
    idle_seconds: u32,
    child_texts: Vec<String>,
}

#[cfg(windows)]
#[tauri::command]
fn get_cursor_pos() -> Result<(i32, i32), String> {
    #[repr(C)]
    struct POINT {
        x: i32,
        y: i32,
    }
    extern "system" {
        fn GetCursorPos(lppoint: *mut POINT) -> i32;
    }
    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        if GetCursorPos(&mut point) != 0 {
            Ok((point.x, point.y))
        } else {
            Err("GetCursorPos failed".to_string())
        }
    }
}

#[cfg(not(windows))]
#[tauri::command]
fn get_cursor_pos() -> Result<(i32, i32), String> {
    Err("Not supported on this platform".to_string())
}

#[cfg(windows)]
#[tauri::command]
fn get_desktop_info() -> Result<DesktopInfo, String> {
    type HWND = *mut std::ffi::c_void;
    type DWORD = u32;
    type BOOL = i32;
    type HPROCESS = *mut std::ffi::c_void;
    type LPARAM = isize;

    #[repr(C)]
    struct LASTINPUTINFO {
        cbSize: u32,
        dwTime: u32,
    }

    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
    const MAX_OTHERS: usize = 12;
    const MAX_CHILD_TEXTS: usize = 16;
    const MAX_CHILD_TEXT_LEN: usize = 120;

    extern "system" {
        fn GetForegroundWindow() -> HWND;
        fn GetWindowTextW(hwnd: HWND, lpstring: *mut u16, nmaxcount: i32) -> i32;
        fn GetWindowTextLengthW(hwnd: HWND) -> i32;
        fn GetClassNameW(hwnd: HWND, lpstring: *mut u16, nmaxcount: i32) -> i32;
        fn GetWindowThreadProcessId(hwnd: HWND, lpdwprocessid: *mut DWORD) -> DWORD;
        fn OpenProcess(access: u32, inherit: BOOL, pid: DWORD) -> HPROCESS;
        fn QueryFullProcessImageNameW(
            h: HPROCESS,
            flags: u32,
            buf: *mut u16,
            size: *mut u32,
        ) -> BOOL;
        fn CloseHandle(h: HPROCESS) -> BOOL;
        fn EnumWindows(
            lpenumfunc: extern "system" fn(HWND, LPARAM) -> BOOL,
            lparam: LPARAM,
        ) -> BOOL;
        fn EnumChildWindows(
            hwnd: HWND,
            lpenumfunc: extern "system" fn(HWND, LPARAM) -> BOOL,
            lparam: LPARAM,
        ) -> BOOL;
        fn IsWindowVisible(hwnd: HWND) -> BOOL;
        fn GetSystemMetrics(n: i32) -> i32;
        fn GetLastInputInfo(plii: *mut LASTINPUTINFO) -> BOOL;
        fn GetTickCount() -> u32;
    }

    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    unsafe fn read_title(hwnd: HWND) -> Option<String> {
        let len = GetWindowTextLengthW(hwnd);
        if len == 0 {
            return None;
        }
        let mut buf = vec![0u16; (len + 1) as usize];
        let got = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
        if got <= 0 {
            return None;
        }
        Some(
            OsString::from_wide(&buf[..got as usize])
                .to_string_lossy()
                .into_owned(),
        )
    }

    unsafe fn read_class_name(hwnd: HWND) -> String {
        let mut buf = [0u16; 64];
        let got = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
        if got <= 0 {
            return String::new();
        }
        OsString::from_wide(&buf[..got as usize])
            .to_string_lossy()
            .into_owned()
    }

    unsafe fn read_process_name(hwnd: HWND) -> String {
        let mut pid: DWORD = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return String::new();
        }
        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if h.is_null() {
            return String::new();
        }
        let mut buf = [0u16; 260];
        let mut size = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(h);
        if ok == 0 {
            return String::new();
        }
        let path = OsString::from_wide(&buf[..size as usize])
            .to_string_lossy()
            .into_owned();
        path.rsplit('\\').next().unwrap_or(&path).to_string()
    }

    unsafe fn read_window_info(hwnd: HWND) -> WindowInfo {
        WindowInfo {
            title: read_title(hwnd).unwrap_or_default(),
            process: read_process_name(hwnd),
            class_name: read_class_name(hwnd),
        }
    }

    unsafe fn get_idle_seconds() -> u32 {
        let mut info = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        if GetLastInputInfo(&mut info) == 0 {
            return 0;
        }
        let now = GetTickCount();
        let diff = now.wrapping_sub(info.dwTime);
        diff / 1000
    }

    struct Collector {
        foreground_hwnd: HWND,
        others: Vec<WindowInfo>,
    }

    extern "system" fn enum_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        unsafe {
            let c = &mut *(lparam as *mut Collector);
            if c.others.len() >= MAX_OTHERS {
                return 0;
            }
            if hwnd == c.foreground_hwnd {
                return 1;
            }
            if IsWindowVisible(hwnd) == 0 {
                return 1;
            }
            let title = match read_title(hwnd) {
                Some(t) => t,
                None => return 1,
            };
            let process = read_process_name(hwnd);
            let class_name = read_class_name(hwnd);
            c.others.push(WindowInfo {
                title,
                process,
                class_name,
            });
            1
        }
    }

    struct ChildCollector {
        texts: Vec<String>,
    }

    extern "system" fn enum_child_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        unsafe {
            let c = &mut *(lparam as *mut ChildCollector);
            if c.texts.len() >= MAX_CHILD_TEXTS {
                return 0;
            }
            let len = GetWindowTextLengthW(hwnd);
            if len <= 0 {
                return 1;
            }
            let read_len = (len as usize).min(MAX_CHILD_TEXT_LEN);
            let mut buf = vec![0u16; read_len + 1];
            let got = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
            if got <= 0 {
                return 1;
            }
            let text = OsString::from_wide(&buf[..got as usize])
                .to_string_lossy()
                .into_owned();
            if text.trim().is_empty() {
                return 1;
            }
            c.texts.push(text);
            1
        }
    }

    unsafe {
        let screen_w = GetSystemMetrics(0);
        let screen_h = GetSystemMetrics(1);
        let idle_seconds = get_idle_seconds();
        let fg = GetForegroundWindow();

        let foreground = if !fg.is_null() {
            let info = read_window_info(fg);
            if info.title.is_empty() && info.process.is_empty() {
                None
            } else {
                Some(info)
            }
        } else {
            None
        };

        let mut child_texts = Vec::new();
        if !fg.is_null() {
            let mut cc = ChildCollector { texts: Vec::new() };
            EnumChildWindows(fg, enum_child_callback, &mut cc as *mut _ as LPARAM);
            child_texts = cc.texts;
        }

        let mut collector = Collector {
            foreground_hwnd: fg,
            others: Vec::new(),
        };
        EnumWindows(enum_callback, &mut collector as *mut _ as LPARAM);

        Ok(DesktopInfo {
            foreground,
            others: collector.others,
            screen_w,
            screen_h,
            idle_seconds,
            child_texts,
        })
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn get_desktop_info() -> Result<DesktopInfo, String> {
    use std::process::Command;

    let foreground = (|| -> Option<WindowInfo> {
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
    })();

    let (screen_w, screen_h) = (|| -> Option<(i32, i32)> {
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
    })()
    .unwrap_or((0, 0));

    Ok(DesktopInfo {
        foreground,
        others: vec![],
        screen_w,
        screen_h,
        idle_seconds: 0,
        child_texts: vec![],
    })
}

#[cfg(target_os = "linux")]
#[tauri::command]
fn get_desktop_info() -> Result<DesktopInfo, String> {
    use std::process::Command;

    let foreground = (|| -> Option<WindowInfo> {
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
    })();

    let (screen_w, screen_h) = (|| -> Option<(i32, i32)> {
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
    })()
    .unwrap_or((0, 0));

    Ok(DesktopInfo {
        foreground,
        others: vec![],
        screen_w,
        screen_h,
        idle_seconds: 0,
        child_texts: vec![],
    })
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
#[tauri::command]
fn get_desktop_info() -> Result<DesktopInfo, String> {
    Err("Not supported on this platform".to_string())
}

use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::Manager;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<String, String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let len = content.len();
    fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(format!("已写入 {} 字节", len))
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<serde_json::Value>, String> {
    let mut entries: Vec<serde_json::Value> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| {
            let e = e.ok()?;
            let ft = e.file_type().ok()?;
            let meta = e.metadata().ok()?;
            Some(serde_json::json!({
                "name": e.file_name().to_string_lossy(),
                "is_dir": ft.is_dir(),
                "size": meta.len(),
            }))
        })
        .collect();
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
    Ok(entries)
}

#[tauri::command]
fn run_command(command: String) -> Result<String, String> {
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
    let output = Command::new(shell)
        .args([flag, &command])
        .output()
        .map_err(|e| format!("命令执行失败: {}", e))?;
    let mut result = String::new();
    if !output.stdout.is_empty() {
        result.push_str(&String::from_utf8_lossy(&output.stdout).trim());
    }
    if !output.stderr.is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str(&String::from_utf8_lossy(&output.stderr).trim());
    }
    if !output.status.success() && result.is_empty() {
        result = format!("命令退出码: {}", output.status.code().unwrap_or(-1));
    }
    Ok(result)
}

#[tauri::command]
fn get_workspace_root() -> Result<String, String> {
    let a = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())?;
    println!("{}", a);
    Ok(a)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            use tauri_plugin_dialog::DialogExt;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            app.dialog()
                .message("养猫要专心！一只就够了~")
                .title("逆云")
                .show(|_| {});
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_cursor_pos,
            get_desktop_info,
            read_file,
            write_file,
            list_directory,
            run_command,
            get_workspace_root,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

            let show = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("逆云")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
