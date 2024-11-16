// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use apicize_lib::{
    apicize::ApicizeExecution,
    oauth2_client_tokens::{clear_all_oauth2_tokens, clear_oauth2_token},
    test_runner, ApicizeSettings, ColorScheme, Workspace,
};
use std::{
    collections::HashMap,
    env, fs,
    path::{Path, PathBuf},
    sync::Arc,
    time::Instant,
};
use tauri::{Manager, State};
use tauri_plugin_clipboard::Clipboard;
use tokio_util::sync::CancellationToken;

use std::sync::{Mutex, OnceLock};

// static COUNTER: AtomicU32 = AtomicU32::new(1);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            let mut settings = if let Ok(loaded_settings) = ApicizeSettings::open() {
                loaded_settings.data
            } else {
                // If unable to load settings, try and put into place some sensible defaults
                ApicizeSettings {
                    workbook_directory: Some(String::from(
                        app.path()
                            .document_dir()
                            .unwrap()
                            .join("apicize")
                            .to_string_lossy(),
                    )),
                    font_size: 12,
                    color_scheme: ColorScheme::Dark,
                    editor_panels: String::from(""),
                    last_workbook_file_name: None,
                    recent_workbook_file_names: None,
                }
            };

            let args: Vec<String> = env::args().collect();
            if args.len() > 1 {
                if let Some(file_argument) = args.get(1) {
                    if let Ok(true) = fs::exists(file_argument) {
                        settings.last_workbook_file_name = Some(file_argument.to_owned());
                    }
                }
            }

            if settings.last_workbook_file_name.is_none() {
                if let Some(last_file) = &settings.last_workbook_file_name {
                    if let Ok(true) = fs::exists(last_file) {
                        settings.last_workbook_file_name = Some(last_file.to_owned());
                    }
                } else if let Some(workbook_directory) = &settings.workbook_directory {
                    if let Ok(false) = fs::exists(workbook_directory) {
                        if let Ok(()) = fs::create_dir(workbook_directory) {
                            let destination = Path::new(workbook_directory).join("demo.apicize");
                            if let Ok(resources) = &app.path().resource_dir() {
                                let source = resources.join("help").join("demo.apicize");
                                if fs::copy(&source, &destination).is_ok() {
                                    settings.last_workbook_file_name =
                                        Some(String::from(destination.to_string_lossy()));
                                }
                            }
                        }
                    }
                }
            }

            main_window
                .eval(&format!(
                    "let loadedSettings={};",
                    serde_json::to_string(&settings).unwrap()
                ))
                .unwrap();
            Ok(())
        })
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // .plugin(
        //     tauri_plugin_log::Builder::new()
        //         .targets([
        //             Target::new(TargetKind::Stdout),
        //             // Target::new(TargetKind::LogDir { file_name: None }),
        //             // Target::new(TargetKind::Webview),                ])
        //         ])
        //         .build(),
        // )
        // .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // let ctr = &COUNTER.fetch_add(1, Ordering::Relaxed);
            // let window_name = format!("main-{}", ctr);

            // let mut config = app.config().app.windows.get(0).unwrap().clone();
            // config.label = window_name;
            // tauri::WebviewWindowBuilder::from_config(app, &config)
            //     .unwrap()
            //     .build()
            //     .unwrap()
            //     .set_focus()
            //     .unwrap();

            // let webview_url = tauri::WebviewUrl::App("index.html".into());
            // tauri::WebviewWindowBuilder::new(app, "main1", webview_url.clone())
            //     .title(window_name)
            //     .build()
            //     .unwrap()
            //     .set_focus()
            //     .unwrap();

            app.get_webview_window("main")
                .expect("no main window")
                .set_focus()
                .unwrap()
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            open_workspace,
            save_workspace,
            open_settings,
            save_settings,
            run_request,
            cancel_request,
            clear_cached_authorization,
            // get_environment_variables,
            is_release_mode,
            get_clipboard_image_base64,
        ])
        .run(tauri::generate_context!())
        .expect("error running Apicize");
}

#[tauri::command]
async fn open_workspace(path: String) -> Result<Workspace, String> {
    match Workspace::open_from_file(&PathBuf::from(path), None) {
        Ok(workspace) => {
            clear_all_oauth2_tokens().await;
            Ok(workspace)
        }
        Err(err) => Err(format!("{}", err.error)),
    }
}

#[tauri::command]
fn save_workspace(workspace: Workspace, path: String) -> Result<(), String> {
    match workspace.save(&PathBuf::from(path)) {
        Ok(..) => Ok(()),
        Err(err) => Err(format!("{}", err.error)),
    }
}

#[tauri::command]
async fn open_settings() -> Result<ApicizeSettings, String> {
    match ApicizeSettings::open() {
        Ok(result) => {
            clear_all_oauth2_tokens().await;
            Ok(result.data)
        }
        Err(err) => Err(format!("{}", err.error)),
    }
}

#[tauri::command]
async fn save_settings(settings: ApicizeSettings) -> Result<(), String> {
    match settings.save() {
        Ok(..) => Ok(()),
        Err(err) => Err(format!("{}", err.error)),
    }
}

fn cancellation_tokens() -> &'static Mutex<HashMap<String, CancellationToken>> {
    static TOKENS: OnceLock<Mutex<HashMap<String, CancellationToken>>> = OnceLock::new();
    TOKENS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
async fn run_request(
    workspace: Workspace,
    request_id: String,
    override_number_of_runs: Option<usize>,
) -> Result<ApicizeExecution, String> {
    let arc_test_started = Arc::new(Instant::now());
    let shared_workspace = Arc::new(workspace);
    let cancellation = CancellationToken::new();
    {
        cancellation_tokens()
            .lock()
            .unwrap()
            .insert(request_id.clone(), cancellation.clone());
    }

    let response = test_runner::run(
        shared_workspace,
        Some(vec![request_id.clone()]),
        Some(cancellation),
        arc_test_started,
        override_number_of_runs,
    )
    .await;

    cancellation_tokens().lock().unwrap().remove(&request_id);

    match response {
        Ok(result) => Ok(result),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
async fn cancel_request(request_id: String) {
    let tokens = cancellation_tokens().lock().unwrap();
    if let Some(token) = tokens.get(&request_id) {
        token.cancel()
    }
}

#[tauri::command]
async fn clear_cached_authorization(authorization_id: String) -> bool {
    clear_oauth2_token(authorization_id.as_str()).await
}

#[tauri::command]
fn get_clipboard_image_base64(clipboard: State<Clipboard>) -> Result<String, String> {
    match clipboard.has_image() {
        Ok(has_image) => {
            if has_image {
                clipboard.read_image_base64()
            } else {
                Err(String::from("Clipboard does not contain an image"))
            }
        }
        Err(msg) => Err(msg),
    }
}

// #[tauri::command]
// fn get_environment_variables() -> Vec<(String, String)> {
//     std::env::vars().into_iter().map1(|e| e).collect()
// }

#[tauri::command]
fn is_release_mode() -> bool {
    !cfg!(debug_assertions)
}
