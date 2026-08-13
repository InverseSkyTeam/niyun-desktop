
use crate::commands::desktop::WindowInfo;

pub type HWND = *mut std::ffi::c_void;
pub type DWORD = u32;
pub type BOOL = i32;
pub type HPROCESS = *mut std::ffi::c_void;
pub type LPARAM = isize;

#[repr(C)]
pub struct POINT {
    pub x: i32,
    pub y: i32,
}

#[repr(C)]
#[allow(non_snake_case)]
pub struct LASTINPUTINFO {
    pub cbSize: u32,
    pub dwTime: u32,
}

pub const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
pub const MAX_OTHERS: usize = 12;
pub const MAX_CHILD_TEXTS: usize = 16;
pub const MAX_CHILD_TEXT_LEN: usize = 120;

#[allow(non_snake_case)]
extern "system" {
    pub fn GetCursorPos(lppoint: *mut POINT) -> i32;
    pub fn GetForegroundWindow() -> HWND;
    pub fn GetWindowTextW(hwnd: HWND, lpstring: *mut u16, nmaxcount: i32) -> i32;
    pub fn GetWindowTextLengthW(hwnd: HWND) -> i32;
    pub fn GetClassNameW(hwnd: HWND, lpstring: *mut u16, nmaxcount: i32) -> i32;
    pub fn GetWindowThreadProcessId(hwnd: HWND, lpdwprocessid: *mut DWORD) -> DWORD;
    pub fn OpenProcess(access: u32, inherit: BOOL, pid: DWORD) -> HPROCESS;
    pub fn QueryFullProcessImageNameW(
        h: HPROCESS,
        flags: u32,
        buf: *mut u16,
        size: *mut u32,
    ) -> BOOL;
    pub fn CloseHandle(h: HPROCESS) -> BOOL;
    pub fn EnumWindows(
        lpenumfunc: extern "system" fn(HWND, LPARAM) -> BOOL,
        lparam: LPARAM,
    ) -> BOOL;
    pub fn EnumChildWindows(
        hwnd: HWND,
        lpenumfunc: extern "system" fn(HWND, LPARAM) -> BOOL,
        lparam: LPARAM,
    ) -> BOOL;
    pub fn IsWindowVisible(hwnd: HWND) -> BOOL;
    pub fn GetSystemMetrics(n: i32) -> i32;
    pub fn GetLastInputInfo(plii: *mut LASTINPUTINFO) -> BOOL;
    pub fn GetTickCount() -> u32;
}

pub unsafe fn read_title(hwnd: HWND) -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

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

pub unsafe fn read_class_name(hwnd: HWND) -> String {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    let mut buf = [0u16; 64];
    let got = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
    if got <= 0 {
        return String::new();
    }
    OsString::from_wide(&buf[..got as usize])
        .to_string_lossy()
        .into_owned()
}

pub unsafe fn read_process_name(hwnd: HWND) -> String {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

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

pub unsafe fn read_window_info(hwnd: HWND) -> WindowInfo {
    WindowInfo {
        title: read_title(hwnd).unwrap_or_default(),
        process: read_process_name(hwnd),
        class_name: read_class_name(hwnd),
    }
}

pub unsafe fn get_idle_seconds() -> u32 {
    let mut info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    if GetLastInputInfo(&mut info) == 0 {
        return 0;
    }
    GetTickCount().wrapping_sub(info.dwTime) / 1000
}

pub struct WindowCollector {
    pub foreground_hwnd: HWND,
    pub others: Vec<WindowInfo>,
}

pub extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    unsafe {
        let c = &mut *(lparam as *mut WindowCollector);
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

pub struct ChildTextCollector {
    pub texts: Vec<String>,
}

pub extern "system" fn enum_child_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    unsafe {
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;

        let c = &mut *(lparam as *mut ChildTextCollector);
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
