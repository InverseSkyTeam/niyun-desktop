mod commands;
mod tray;
mod workspace;

fn handle_second_instance(app: &tauri::AppHandle) {
    use tauri_plugin_dialog::DialogExt;
    tray::show_main_window(app);
    app.dialog()
        .message("养猫要专心！一只就够了~")
        .title("逆云")
        .show(|_| {});
}

fn invoke_handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        commands::desktop::get_cursor_pos,
        commands::desktop::get_desktop_info,
        commands::files::read_file,
        commands::files::write_file,
        commands::files::list_directory,
        commands::system::run_command,
        commands::system::get_workspace_root,
        commands::system::pick_workspace,
        commands::system::set_workspace_root,
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            handle_second_instance(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(invoke_handler())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
