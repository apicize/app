// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod dragdrop;
pub mod error;
pub mod navigation;
pub mod pkce;
pub mod sessions;
pub mod settings;
pub mod trace;
pub mod updates;
pub mod workspaces;
use apicize_lib::{
    ApicizeRunner, Authorization, CachedTokenInfo, DataSet, DataSourceType, ExecutionResultDetail,
    ExecutionResultSuccess, ExecutionResultSummary, ExecutionState, Parameters, PkceTokenResult,
    RequestBody, RequestEntry, TestRunnerContext, TokenResult, Validated, Workspace,
    build_absolute_file_name, clear_all_oauth2_tokens_from_cache, clear_oauth2_token_from_cache,
    editing::indexed_entities::IndexedEntityPosition, get_existing_absolute_file_name,
    get_oauth2_client_credentials, get_relative_file_name, store_oauth2_token_in_cache,
};
use dirs::home_dir;
use dragdrop::DroppedFile;
use error::ApicizeAppError;
use indexmap::IndexMap;
use navigation::{Navigation, UpdateResponse, UpdatedNavigationEntry};
use pathdiff::diff_paths;
use pkce::{OAuth2PkceInfo, OAuth2PkceRequest, OAuth2PkceService};
use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use sessions::{ExecutionResultViewState, Session, SessionSaveState, Sessions};
use settings::{ApicizeSettings, ColorScheme};
use std::{
    collections::{HashMap, HashSet},
    env,
    fs::{self, File, exists},
    io,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, OnceLock},
};
use tauri::async_runtime::RwLock;
use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, PhysicalSize, State, WebviewWindowBuilder, Wry,
};
use tauri_plugin_clipboard::Clipboard;
use tokio_util::sync::CancellationToken;
use trace::{ReqwestEvent, ReqwestLogger};
use workspaces::{
    BodyMimeInfo, ClipboardPayloadRequest, Entities, Entity, EntityType, ExecutionEvent,
    OpenDataSetFileResponse, OpenWorkspaceResult, PersistableData, RequestBodyInfo,
    RequestEntryInfo, RequestExecution, WorkspaceInfo, WorkspaceInitialization, WorkspaceMode,
    WorkspaceSaveStatus, Workspaces,
};

use crate::{
    sessions::SessionEntity,
    updates::{
        DataSetUpdate, EntityUpdate, EntityUpdateNotification, RequestGroupUpdate, RequestUpdate,
    },
    workspaces::DataSetContent,
};

struct AuthState {
    pkce: Mutex<OAuth2PkceService>,
}

struct SettingsState {
    settings: RwLock<ApicizeSettings>,
}

struct WorkspacesState {
    pub workspaces: RwLock<Workspaces>,
}

struct SessionsState {
    pub sessions: RwLock<Sessions>,
}

static REQWEST_LOGGER: OnceLock<ReqwestLogger> = OnceLock::new();

fn copy_files(source: &Path, destination: &Path) -> io::Result<()> {
    let exists = fs::exists(destination)?;
    if !exists {
        fs::create_dir_all(destination)?;
    }

    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let path = entry.path();
        let dest = destination.join(entry.file_name());
        if path.is_dir() {
            copy_files(path.as_path(), &dest)?;
        } else {
            fs::copy(path.as_path(), &dest)?;
        }
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // When first loading, we either:
            // 1. Load the named workbook if passed in as an argument
            // 2. Load the last workbook file name if stored in settings
            // 3. Open a new workbook

            let mut load_workbook: Option<String> = None;

            let args: Vec<String> = env::args().collect();
            if args.len() > 1
                && let Some(file_argument) = args.get(1)
                && let Ok(true) = fs::exists(file_argument)
            {
                load_workbook = Some(file_argument.to_string());
            }

            let mut settings = if let Ok(loaded_settings) = ApicizeSettings::open() {
                if load_workbook.is_none() {
                    load_workbook = loaded_settings.data.last_workbook_file_name.clone()
                }

                loaded_settings.data
            } else {
                // If unable to load settings, try and put into place some sensible defaults
                generate_settings_defaults(app.handle().clone())?
            };

            // Copy demo files from resources if we do not have settings saved
            let is_new_install = settings.last_workbook_file_name.is_none();

            if is_new_install {
                // If we have not loaded a workbook before, copy the demo
                if let Some(workbook_directory) = &settings.workbook_directory
                    && let Ok(resources) = &app.path().resource_dir()
                {
                    let src_demo_directory = resources.join("help").join("demo");
                    let dest_demo_directory = Path::new(workbook_directory);

                    if let Err(err) = copy_files(&src_demo_directory, dest_demo_directory) {
                        eprintln!(
                            "Unable to copy demo files from {} to {}: {}",
                            src_demo_directory.to_string_lossy(),
                            dest_demo_directory.to_string_lossy(),
                            err
                        );
                    }

                    load_workbook = Some(
                        dest_demo_directory
                            .join("demo.apicize")
                            .as_os_str()
                            .to_string_lossy()
                            .to_string(),
                    );
                }
            }

            // Set up the workspace store with the initially loaded workspace
            let mut workspaces = Workspaces::default();
            let mut sessions = Sessions::default();

            // Initialize log hook to monitor Reqwest activity
            let reqwest_logger = REQWEST_LOGGER.get_or_init(|| {
                let handle = tokio::runtime::Handle::current();
                let _ = handle.enter();
                ReqwestLogger::new(app.handle().clone())
            });

            let _ = log::set_logger(reqwest_logger);

            log::set_max_level(log::LevelFilter::Trace);

            create_workspace(
                app.handle().clone(),
                &mut sessions,
                &mut workspaces,
                &mut settings,
                load_workbook,
                true,
                None,
                true,
            )
            .unwrap();

            // Set up sessions
            app.manage(SessionsState {
                sessions: RwLock::new(sessions),
            });

            // Set up PKCE service
            let auth_state = AuthState {
                pkce: Mutex::new(OAuth2PkceService::new(app.handle().clone())),
            };

            if settings.pkce_listener_port > 0 {
                auth_state
                    .pkce
                    .lock()
                    .unwrap()
                    .activate_listener(settings.pkce_listener_port);
            }

            app.manage(auth_state);

            // Set up settings
            app.manage(SettingsState {
                settings: RwLock::new(settings),
            });
            // Set up workspaces
            app.manage(WorkspacesState {
                workspaces: RwLock::new(workspaces),
            });

            Ok(())
        })
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // .plugin(
        //     tauri_plugin_log::Builder::new()
        //         .level(log::LevelFilter::Warn)
        //         .level_for("reqwest", log::LevelFilter::Trace)
        //         // .level_for("apicize", log::LevelFilter::Trace)
        //         // .level_for("apicize::workspaces", log::LevelFilter::Trace)
        //         // .level_for("apicize::sessions", log::LevelFilter::Trace)
        //         .targets([
        //             Target::new(TargetKind::Stdout),
        //             // Target::new(TargetKind::LogDir { file_name: None }),
        //             // Target::new(TargetKind::Webview),                ])
        //         ])
        //         .build(),
        // )
        // .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            tokio::task::block_in_place(|| {
                tauri::async_runtime::block_on(new_workspace(
                    app.clone(),
                    app.state::<SessionsState>(),
                    app.state::<WorkspacesState>(),
                    app.state::<SettingsState>(),
                    None,
                    true,
                ))
            })
            .unwrap();
        }))
        // .plugin(tauri_plugin_window_state::Builder::default()
        //     .build())
        .invoke_handler(tauri::generate_handler![
            generate_settings_defaults,
            new_workspace,
            open_workspace,
            save_workspace,
            close_workspace,
            clone_workspace,
            show_session,
            get_workspace_save_status,
            open_settings,
            save_settings,
            start_execution,
            cancel_execution,
            get_execution,
            clear_execution,
            get_execution_result,
            get_execution_result_view_state,
            update_execution_result_view_state,
            store_token,
            clear_all_cached_authorizations,
            clear_cached_authorization,
            copy_to_clipboard,
            // get_environment_variables,
            is_release_mode,
            get_request_body,
            update_request_body,
            update_request_body_from_clipboard,
            set_pkce_port,
            generate_authorization_info,
            // launch_pkce_window,
            retrieve_oauth2_client_token,
            retrieve_oauth2_pkce_token,
            refresh_token,
            get_clipboard_file_data,
            get,
            update_active_entity,
            update_expanded_items,
            update_mode,
            update_help_topic,
            get_title,
            get_dirty,
            get_request_active_authorization,
            get_request_active_data,
            get_data_set_content,
            list_parameters,
            add,
            update,
            delete,
            move_entity,
            list_logs,
            clear_logs,
            get_entity_type,
            find_descendant_groups,
            get_storage_information,
            open_data_set_file,
            open_data_set_file_from,
            save_data_set_file,
        ])
        .run(tauri::generate_context!())
        .expect("error running Apicize");
}

fn format_window_title(display_name: &str, dirty: bool) -> String {
    let name_part = if display_name.is_empty() {
        "(New)"
    } else {
        display_name
    };
    let mut title = String::with_capacity(name_part.len() + 12); // Pre-allocate: " - Apicize *"

    title.push_str(name_part);
    title.push_str(" - Apicize");
    if dirty {
        title.push(' ');
        title.push('*');
    }

    title
}

#[tauri::command]
fn generate_settings_defaults(app: AppHandle) -> Result<ApicizeSettings, ApicizeAppError> {
    let workbook_directory = String::from(
        app.path()
            .document_dir()
            .unwrap()
            .join("apicize")
            .to_string_lossy(),
    );

    fs::create_dir_all(&workbook_directory)?;

    Ok(ApicizeSettings {
        workbook_directory: Some(workbook_directory),
        font_size: 12,
        navigation_font_size: 12,
        color_scheme: ColorScheme::Dark,
        editor_panels: String::from(""),
        last_workbook_file_name: None,
        recent_workbook_file_names: None,
        pkce_listener_port: 8080,
        always_hide_nav_tree: false,
        show_diagnostic_info: false,
        report_format: apicize_lib::ExecutionReportFormat::JSON,
        editor_indent_size: 3,
        editor_check_js_syntax: true,
        editor_detect_existing_indent: true,
    })
}

#[allow(clippy::too_many_arguments)]
fn create_workspace(
    app: AppHandle,
    sessions: &mut Sessions,
    workspaces: &mut Workspaces,
    settings: &mut ApicizeSettings,
    open_existing_file_name: Option<String>,
    create_new_if_error: bool,
    current_session_id: Option<String>,
    open_in_new_session: bool,
) -> Result<(), ApicizeAppError> {
    let mut save_recent_file_name: Option<String> = None;

    for (id, info) in &workspaces.workspaces {
        println!("*** Open workspace {} ({id})", info.file_name);
    }

    // Find the existing workspace for the file, if there is one
    let mut existing_workspace_id = match &open_existing_file_name {
        Some(file_name) => workspaces.workspaces.iter().find_map(|(id, info)| {
            if !info.file_name.is_empty() && file_name.eq(&info.file_name) {
                Some(id.clone())
            } else {
                None
            }
        }),
        None => None,
    };

    // If this is an open workspace, and we are on the last session, then close the workspace
    // to clear any changes made *without* saving
    let session_to_clear = if let Some(current_session_id) = &current_session_id
        && !open_in_new_session
        && let Some(id) = &existing_workspace_id
    {
        let existing_sessions = sessions.get_workspace_session_ids(id);
        if existing_sessions.len() == 1 && current_session_id == existing_sessions.first().unwrap()
        {
            Some(id.clone())
        } else {
            None
        }
    } else {
        None
    };

    if let Some(id) = session_to_clear {
        workspaces.remove_workspace(&id);
        existing_workspace_id = None;
    }

    let workspace_result = match &open_existing_file_name {
        Some(file_name) => {
            if let Some(existing_workspace_id) = &existing_workspace_id {
                // If there is a workspace already open for this file, switch to that
                let workspace = workspaces.workspaces.get(existing_workspace_id).unwrap();

                Ok(OpenWorkspaceResult {
                    workspace_id: existing_workspace_id.to_string(),
                    directory: workspace.directory.to_string(),
                    display_name: workspace.display_name.to_string(),
                    error: None,
                })
            } else {
                // If there is not a workspace already open for this file, open the file,
                // create a workspace and add a session
                let path = PathBuf::from(&file_name);
                match Workspace::open(
                    Some(&path),
                    None,
                    None,
                    None,
                    None,
                    None,
                    path.parent().unwrap(),
                ) {
                    Ok(workspace) => {
                        save_recent_file_name = Some(file_name.clone());
                        Ok(workspaces.add_workspace(workspace, file_name, false))
                    }
                    Err(err) => {
                        if create_new_if_error {
                            let mut result = workspaces.add_workspace(Workspace::new()?, "", true);
                            result.error = Some(format!("{err}"));
                            Ok(result)
                        } else {
                            Err(err)
                        }
                    }
                }
            }
        }
        None => Ok(workspaces.add_workspace(Workspace::new()?, "", true)),
    }?;

    // Update the recently accessed workbook list in settings
    if let Some(file_name) = save_recent_file_name {
        settings.update_recent_workbook_file_name(&file_name);
        settings.save()?;
        app.emit("update_settings", settings.clone()).unwrap();
    }

    let trace_title: String;
    {
        let info = workspaces.get_workspace_info_mut(&workspace_result.workspace_id)?;
        trace_title = {
            let session_name = match &current_session_id {
                Some(id) => id.as_str(),
                None => "new",
            };
            let mut title =
                String::with_capacity(32 + session_name.len() + info.display_name.len());
            title.push_str("Open (session: ");
            title.push_str(session_name);
            title.push_str(", workspace: ");
            title.push_str(&info.display_name);
            title.push(')');
            title
        };

        if let Some(active_session_id) = current_session_id.as_ref()
            && !open_in_new_session
        {
            // If we are assigning the opened workspace to an existing session, send necessary info
            let session =
                sessions.change_workspace(active_session_id, &workspace_result.workspace_id)?;

            if let Some(id) = info.workspace.requests.top_level_ids.first() {
                match info.workspace.requests.entities.get(id) {
                    Some(RequestEntry::Request(request)) => {
                        session.active_entity = Some(SessionEntity {
                            entity_id: request.id.clone(),
                            entity_type: EntityType::Request,
                        });
                        session.expanded_items = Some(vec!["hdr-r".to_string()]);
                    }
                    Some(RequestEntry::Group(group)) => {
                        session.active_entity = Some(SessionEntity {
                            entity_id: group.id.clone(),
                            entity_type: EntityType::Group,
                        });
                        session.expanded_items = Some(vec![
                            "hdr-r".to_string(),
                            format!("{}-{}", 3, group.id.clone()),
                        ]);
                    }
                    None => {
                        session.active_entity = None;
                        session.expanded_items = None;
                    }
                }
            }
            session.request_exec_ctrs.clear();
            session.mode = WorkspaceMode::Normal;
            session.help_topic = None;

            let window = app.get_webview_window(active_session_id).unwrap();
            window
                .set_title(format_window_title(&workspace_result.display_name, info.dirty).as_str())
                .unwrap();

            let init = WorkspaceInitialization {
                session: session.clone(),
                navigation: info.navigation.clone(),
                save_state: SessionSaveState {
                    file_name: info.file_name.clone(),
                    directory: info.directory.clone(),
                    display_name: info.display_name.clone(),
                    dirty: info.dirty,
                    editor_count: sessions
                        .get_workspace_session_ids(&workspace_result.workspace_id)
                        .len(),
                },
                defaults: info.workspace.defaults.clone(),
                settings: settings.clone(),
                executions: info
                    .executions
                    .iter()
                    .filter_map(|(id, exec)| match exec.execution_state {
                        ExecutionState::RUNNING => Some((
                            id.to_string(),
                            ExecutionEvent::Start {
                                execution_state: ExecutionState::RUNNING,
                            },
                        )),
                        ExecutionState::ERROR => None,
                        _ => Some((
                            id.to_string(),
                            ExecutionEvent::Complete(RequestExecution {
                                menu: exec.menu.clone(),
                                execution_state: exec.execution_state,
                                active_summaries: exec.active_summaries.clone(),
                            }),
                        )),
                    })
                    .collect::<FxHashMap<String, ExecutionEvent>>(),
                error: None,
            };

            app.emit_to(active_session_id, "initialize", init).unwrap();
        } else {
            let active_entity: Option<SessionEntity>;
            let expanded_items: Option<Vec<String>>;
            let mode: WorkspaceMode;
            let help_topic: Option<String>;

            if let Some(existing_session_id) = &current_session_id
                && let Ok(existing_session) = sessions.get_session(existing_session_id)
                && existing_session.workspace_id == workspace_result.workspace_id
            {
                // Match current session's display state
                active_entity = existing_session.active_entity.clone();
                expanded_items = existing_session.expanded_items.clone();
                mode = existing_session.mode;
                help_topic = existing_session.help_topic.clone();
                // existing_session.startup_state.mode = existing_session.mode;
            } else {
                if let Some(id) = info.workspace.requests.top_level_ids.first() {
                    match info.workspace.requests.entities.get(id) {
                        Some(RequestEntry::Request(request)) => {
                            active_entity = Some(SessionEntity {
                                entity_id: request.id.clone(),
                                entity_type: EntityType::Request,
                            });
                            expanded_items = Some(vec!["hdr-r".to_string()]);
                        }
                        Some(RequestEntry::Group(group)) => {
                            active_entity = Some(SessionEntity {
                                entity_id: group.id.clone(),
                                entity_type: EntityType::Group,
                            });
                            expanded_items = Some(vec![
                                "hdr-r".to_string(),
                                format!("{}-{}", 3, group.id.clone()),
                            ]);
                        }
                        None => {
                            active_entity = None;
                            expanded_items = None;
                        }
                    };
                } else {
                    active_entity = None;
                    expanded_items = None;
                }
                mode = WorkspaceMode::Normal;
                help_topic = None;
            }

            let session = Session {
                workspace_id: workspace_result.workspace_id.clone(),
                active_entity,
                expanded_items,
                mode,
                help_topic,
                request_exec_ctrs: HashMap::default(),
                execution_result_view_state: HashMap::default(),
            };

            let init = WorkspaceInitialization {
                session: session.clone(),
                navigation: info.navigation.clone(),
                save_state: SessionSaveState {
                    file_name: info.file_name.clone(),
                    directory: info.directory.clone(),
                    display_name: info.display_name.clone(),
                    dirty: info.dirty,
                    editor_count: sessions
                        .get_workspace_session_ids(&session.workspace_id)
                        .len(),
                },
                defaults: info.workspace.defaults.clone(),
                settings: settings.clone(),
                executions: info
                    .executions
                    .iter()
                    .filter_map(|(id, exec)| match exec.execution_state {
                        ExecutionState::RUNNING => Some((
                            id.to_string(),
                            ExecutionEvent::Start {
                                execution_state: ExecutionState::RUNNING,
                            },
                        )),
                        ExecutionState::ERROR => None,
                        _ => Some((
                            id.to_string(),
                            ExecutionEvent::Complete(RequestExecution {
                                menu: exec.menu.clone(),
                                execution_state: exec.execution_state,
                                active_summaries: exec.active_summaries.clone(),
                            }),
                        )),
                    })
                    .collect::<FxHashMap<String, ExecutionEvent>>(),
                error: None,
            };

            let init_data = serde_json::to_string(&init).unwrap();
            let active_session_id = sessions.add_session(session);

            let webview_url = tauri::WebviewUrl::App("index.html".into());
            let mut builder = tauri::WebviewWindowBuilder::new(
                &app,
                active_session_id.clone(),
                webview_url.clone(),
            )
            .visible(false)
            // .visible(true)
            .prevent_overflow_with_margin(LogicalSize::new(64, 64))
            .title(format_window_title(&workspace_result.display_name, info.dirty).as_str())
            .initialization_script(format!("window.__INIT_DATA__= {init_data};"));

            builder = position_window_builder(&app, builder, &current_session_id);
            let window = builder.build().unwrap();
            // window.show().unwrap();
            window.hide().unwrap();
        }
    }

    // We will remove any workspaces that no longer have active sessions
    let workspace_ids_to_remove = workspaces
        .workspaces
        .keys()
        .filter_map(|workspace_id| {
            if sessions.get_workspace_session_ids(workspace_id).is_empty() {
                Some(workspace_id.clone())
            } else {
                None
            }
        })
        .collect::<Vec<String>>();

    for workspace_id in workspace_ids_to_remove {
        workspaces.remove_workspace(workspace_id.as_str());
    }

    println!("*** {trace_title} ***");
    workspaces.trace_all_workspaces();
    sessions.trace_all_sessions();

    Ok(())
}

fn position_window_builder<'a>(
    app: &AppHandle,
    builder: WebviewWindowBuilder<'a, Wry, AppHandle>,
    session_id: &Option<String>,
) -> WebviewWindowBuilder<'a, Wry, AppHandle> {
    if let Some(id) = &session_id
        && let Some(w) = app.get_webview_window(id)
    {
        let factor = if let Ok(Some(monitor)) = app.primary_monitor() {
            monitor.scale_factor()
        } else {
            1.0
        };

        let mut result: WebviewWindowBuilder<'a, Wry, AppHandle> = builder;
        // If opening from an existing session, position at a 64 pixel offset
        if let Ok(p) = w.outer_position() {
            result = result.position(f64::from(p.x + 64) / factor, f64::from(p.y + 64) / factor);
        }
        if let Ok(b) = w.is_maximized() {
            result = result.maximized(b);
        }
        if let Ok(s) = w.inner_size() {
            result = result.inner_size(f64::from(s.width) / factor, f64::from(s.height) / factor);
        }
        result = result.prevent_overflow();
        return result;
    }

    // If opening window without referencing existing session, open at 80% of monitor size
    let width: u32;
    let height: u32;
    let margin: PhysicalSize<f64>;
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let factor = monitor.scale_factor();
        width = monitor.size().width;
        height = monitor.size().height;
        margin = PhysicalSize::new(
            f64::from(width) / (5.0 * factor),
            f64::from(height) / (5.0 * factor),
        );
    } else {
        width = 1000;
        height = 800;
        margin = PhysicalSize::new(64.0, 64.0);
    }

    builder
        .inner_size(f64::from(width), f64::from(height))
        .prevent_overflow_with_margin(margin)
        .center()
}

#[tauri::command]
async fn clone_workspace(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: String,
) -> Result<(), ApicizeAppError> {
    let workspaces = workspaces_state.workspaces.read().await;
    let mut sessions = sessions_state.sessions.write().await;

    let new_session = {
        let session = sessions.get_session(&session_id)?;
        Session {
            workspace_id: session.workspace_id.clone(),
            request_exec_ctrs: session.request_exec_ctrs.clone(),
            active_entity: session.active_entity.clone(),
            expanded_items: session.expanded_items.clone(),
            mode: session.mode,
            help_topic: session.help_topic.clone(),
            execution_result_view_state: session.execution_result_view_state.clone(),
        }
    };

    let info = workspaces.get_workspace_info(&new_session.workspace_id)?;
    let active_session_id = sessions.add_session(new_session);

    println!(
        "*** Clone (session: {}, workspace: {}) ***",
        &session_id, &info.display_name
    );
    workspaces.trace_all_workspaces();
    sessions.trace_all_sessions();

    let webview_url = tauri::WebviewUrl::App("index.html".into());
    let mut builder =
        tauri::WebviewWindowBuilder::new(&app, active_session_id.clone(), webview_url.clone())
            .visible(false)
            .title(format_window_title(&info.display_name, info.dirty).as_str());
    builder = position_window_builder(&app, builder, &Some(session_id));

    let window = builder.build().unwrap();
    window.hide().unwrap();
    Ok(())
}

#[tauri::command]
fn show_session(app: AppHandle, session_id: String) {
    if let Some(w) = app.get_webview_window(&session_id) {
        w.show().unwrap()
    }
}

#[tauri::command]
async fn new_workspace(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    settings_state: State<'_, SettingsState>,
    current_session_id: Option<String>,
    open_in_new_session: bool,
) -> Result<(), ApicizeAppError> {
    let sessions = &mut sessions_state.sessions.write().await;
    let workspaces = &mut workspaces_state.workspaces.write().await;
    let settings = &mut settings_state.settings.write().await;

    create_workspace(
        app,
        sessions,
        workspaces,
        settings,
        None,
        true,
        current_session_id,
        open_in_new_session,
    )
}

#[tauri::command]
async fn open_workspace(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    settings_state: State<'_, SettingsState>,
    file_name: String,
    session_id: Option<String>,
    open_in_new_session: bool,
) -> Result<(), ApicizeAppError> {
    let sessions = &mut sessions_state.sessions.write().await;
    let workspaces = &mut workspaces_state.workspaces.write().await;
    let settings = &mut settings_state.settings.write().await;

    create_workspace(
        app,
        sessions,
        workspaces,
        settings,
        Some(file_name),
        false,
        session_id,
        open_in_new_session,
    )
}

#[tauri::command]
async fn save_workspace(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    settings_state: State<'_, SettingsState>,
    session_id: &str,
    file_name: Option<String>,
) -> Result<(), ApicizeAppError> {
    let sessions = sessions_state.sessions.write().await;
    let session = sessions.get_session(session_id)?;

    if let Some(specified_file_name) = &file_name {
        let workspaces = workspaces_state.workspaces.read().await;
        let other_file_workspace_ids =
            workspaces.find_workspace_by_filename(specified_file_name, Some(&session.workspace_id));
        if !other_file_workspace_ids.is_empty() {
            return Err(ApicizeAppError::InvalidOperation(
                "A workspace is already open using that workbook name".to_string(),
            ));
        }
    }

    let mut workspaces = workspaces_state.workspaces.write().await;
    let info = workspaces.get_workspace_info_mut(&session.workspace_id)?;
    let save_as = match file_name {
        Some(n) => n,
        None => {
            if info.file_name.is_empty() {
                return Err(ApicizeAppError::FileNameRequired());
            } else {
                info.file_name.clone()
            }
        }
    };

    let save_to = PathBuf::from(&save_as);
    match info.workspace.save(&save_to) {
        Ok(..) => {
            let mut settings = settings_state.settings.write().await;
            if settings.update_recent_workbook_file_name(&save_as) {
                settings.save()?;
                app.emit("update_settings", settings.clone()).unwrap();
            }

            let data_path = std::path::absolute(&save_as)?
                .parent()
                .ok_or(ApicizeAppError::InvalidOperation(
                    "Unable to determine parent director".to_string(),
                ))?
                .to_path_buf();

            for data_set in info.workspace.data.entities.values() {
                let Some(content) = info.data_set_content.get_mut(&data_set.id) else {
                    continue;
                };
                perform_save_data_set_file(data_set, content, &data_path, false)?;
            }

            info.dirty = false;
            info.warn_on_workspace_creds = false;
            info.file_name = save_as.clone();
            info.display_name = save_to
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            dispatch_save_state(&app, &sessions, &session.workspace_id, info, false);
            Ok(())
        }
        Err(err) => Err(ApicizeAppError::ApicizeError(err)),
    }
}

fn perform_save_data_set_file(
    data_set: &DataSet,
    content: &mut DataSetContent,
    data_path: &Path,
    force_save: bool,
) -> Result<(), ApicizeAppError> {
    if !(force_save || content.dirty) {
        return Ok(());
    }

    match data_set.source_type {
        DataSourceType::JSON => {
            // Content is stored directy in workbook
            content.dirty = false;
        }
        DataSourceType::FileJSON => {
            // Write JSON content directly to file
            let save_to_file = build_absolute_file_name(&data_set.source, data_path)?;
            fs::write(
                save_to_file,
                match &content.source_text {
                    Some(txt) => txt,
                    None => "",
                },
            )?;
            content.dirty = false;
        }
        DataSourceType::FileCSV => {
            write_csv_data(
                &build_absolute_file_name(&data_set.source, data_path)?,
                &content.csv_columns,
                &content.csv_rows,
            )?;
            content.dirty = false;
        }
    }
    Ok(())
}

/// Write CSV data out to a file
fn write_csv_data(
    file_name: &PathBuf,
    csv_columns: &Option<Vec<String>>,
    csv_rows: &Option<Vec<HashMap<String, String>>>,
) -> Result<(), ApicizeAppError> {
    let file = File::create(file_name)?;

    let mut writer = csv::Writer::from_writer(file);

    if let (Some(columns), Some(rows)) = (csv_columns, csv_rows) {
        let columns_to_write = columns
            .iter()
            .filter(|c| *c != "_id")
            .cloned()
            .collect::<Vec<String>>();

        // Write header row
        writer.write_record(&columns_to_write)?;

        // Write data rows
        for row in rows {
            let record: Vec<&str> = columns_to_write
                .iter()
                .map(|col| row.get(col).map(|s| s.as_str()).unwrap_or(""))
                .collect();
            writer.write_record(&record)?;
        }
    }

    writer.flush()?;
    Ok(())
}

fn dispatch_save_state(
    app: &AppHandle,
    sessions: &Sessions,
    workspace_id: &str,
    info: &WorkspaceInfo,
    include_navigation: bool,
) {
    if let Some(session_ids) = get_workspace_sessions(workspace_id, sessions, None) {
        let state = SessionSaveState {
            file_name: info.file_name.clone(),
            directory: info.directory.clone(),
            display_name: info.display_name.clone(),
            dirty: info.dirty,
            editor_count: sessions.get_workspace_session_ids(workspace_id).len(),
        };

        for session_id in session_ids {
            app.emit_to(session_id, "save_state", &state).unwrap();
            if include_navigation {
                app.emit_to(session_id, "navigation", &info.navigation)
                    .unwrap();
            }
            if let Some(w) = app.get_webview_window(session_id) {
                w.set_title(format_window_title(&info.display_name, info.dirty).as_str())
                    .unwrap();
            }
        }
    }
}

#[tauri::command]
async fn close_workspace(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
) -> Result<(), ApicizeAppError> {
    let mut sessions = sessions_state.sessions.write().await;
    let session = sessions.get_session(session_id)?;
    let workspace_id = session.workspace_id.clone();

    sessions.remove_session(session_id)?;

    let trace_title: String;
    {
        let workspaces = workspaces_state.workspaces.read().await;
        let info = workspaces.get_workspace_info(&workspace_id)?;
        trace_title = {
            let mut title = String::with_capacity(32 + session_id.len() + info.display_name.len());
            title.push_str("Close (session: ");
            title.push_str(session_id);
            title.push_str(", workspace: ");
            title.push_str(&info.display_name);
            title.push(')');
            title
        };
        dispatch_save_state(&app, &sessions, &workspace_id, info, false);
    }
    {
        let mut workspaces = workspaces_state.workspaces.write().await;
        let editor_count = sessions.get_workspace_session_ids(&workspace_id).len();
        if editor_count == 0 {
            let workbook_auth_ids = workspaces.list_workbook_authorization_ids(&workspace_id)?;
            for auth_id in workbook_auth_ids {
                clear_cached_authorization(auth_id).await;
            }
            workspaces.remove_workspace(&workspace_id);
        }
        println!("*** {trace_title} ***");
        workspaces.trace_all_workspaces();
        sessions.trace_all_sessions();
    }

    Ok(())
}

#[tauri::command]
async fn get_workspace_save_status(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
) -> Result<WorkspaceSaveStatus, ApicizeAppError> {
    let mut workspaces = workspaces_state.workspaces.write().await;
    let sessions = sessions_state.sessions.write().await;

    let session = sessions.get_session(session_id)?;
    let info = workspaces.get_workspace_info_mut(&session.workspace_id)?;

    let any_public_auths = info
        .workspace
        .authorizations
        .child_ids
        .get("W")
        .is_some_and(|c| !c.is_empty());
    let any_public_certs = info
        .workspace
        .certificates
        .child_ids
        .get("W")
        .is_some_and(|c| !c.is_empty());

    let warn_on_workspace_creds = if info.warn_on_workspace_creds {
        any_public_auths || any_public_certs
    } else {
        false
    };

    let any_invalid = info.workspace.requests.entities.values().any(|e| {
        (e.get_validation_warnings().as_ref()).is_some_and(|w| !w.is_empty())
            || (e.get_validation_errors().as_ref()).is_some_and(|w| !w.is_empty())
    });

    Ok(WorkspaceSaveStatus {
        dirty: info.dirty,
        warn_on_workspace_creds,
        any_invalid,
        file_name: info.file_name.clone(),
        directory: info.directory.clone(),
        display_name: info.display_name.clone(),
    })
}

#[tauri::command]
async fn open_settings() -> Result<ApicizeSettings, String> {
    match ApicizeSettings::open() {
        Ok(result) => {
            clear_all_oauth2_tokens_from_cache().await;
            Ok(result.data)
        }
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
async fn save_settings(
    app: AppHandle,
    updated_settings: ApicizeSettings,
    settings_state: State<'_, SettingsState>,
) -> Result<(), String> {
    let mut settings = settings_state.settings.write().await;
    settings.clone_from(&updated_settings);
    match settings.save() {
        Ok(..) => {
            app.emit("update_settings", updated_settings).unwrap();
            Ok(())
        }
        Err(err) => Err(err.to_string()),
    }
}

fn cancellation_tokens() -> &'static Mutex<FxHashMap<String, CancellationToken>> {
    static TOKENS: OnceLock<Mutex<FxHashMap<String, CancellationToken>>> = OnceLock::new();
    TOKENS.get_or_init(|| Mutex::new(FxHashMap::default()))
}

#[tauri::command]
async fn start_execution(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_or_group_id: &str,
    workbook_full_name: String,
    single_run: bool,
) -> Result<(), ApicizeAppError> {
    let cancellation = CancellationToken::new();
    {
        cancellation_tokens()
            .lock()
            .unwrap()
            .insert(request_or_group_id.to_owned(), cancellation.clone());
    }

    let allowed_data_path: Option<PathBuf> = if workbook_full_name.is_empty() {
        None
    } else {
        Some(
            std::path::absolute(&workbook_full_name)
                .unwrap()
                .parent()
                .unwrap()
                .to_path_buf(),
        )
    };

    // Phase 1: Read session data with minimal lock scope
    let workspace_id = {
        let sessions = sessions_state.sessions.read().await;
        let session = sessions.get_session(session_id)?;
        session.workspace_id.clone()
    };

    // Phase 2: Quick read to get workspace data, with # of run overrides if specified, then release lock immediately
    let (cloned_workspace, all_session_ids, previous_state) = {
        let sessions = sessions_state.sessions.read().await;
        let previous_state: ExecutionState;

        // Acquire write lock for minimal time - just to update execution state
        let mut cloned_workspace = {
            let mut workspaces = workspaces_state.workspaces.write().await;
            let info = workspaces.get_workspace_info_mut(&workspace_id)?;

            let exec = info.get_execution_mut(request_or_group_id);
            previous_state = exec.execution_state;
            exec.execution_state = ExecutionState::RUNNING;
            info.workspace.clone()
        }; // Write lock released here

        if single_run
            && let Some(request) = cloned_workspace
                .requests
                .entities
                .get_mut(request_or_group_id)
            && request.get_runs() < 1
        {
            request.set_runs(1);
        }

        // Get session IDs with read lock (can be done concurrently)
        let all_session_ids = get_workspace_sessions(&workspace_id, &sessions, None)
            .unwrap_or_default()
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<String>>();
        (cloned_workspace, all_session_ids, previous_state)
    };

    // Phase 3: Emit execution events
    let start_event = HashMap::<String, ExecutionEvent>::from([(
        request_or_group_id.to_string(),
        ExecutionEvent::Start {
            execution_state: ExecutionState::RUNNING,
        },
    )]);

    for emit_to_session_id in &all_session_ids {
        app.emit_to(emit_to_session_id, "execution_event", &start_event)
            .unwrap();
    }

    // Phase 4: Create runner outside of locks
    let context = Arc::new(TestRunnerContext::new(
        cloned_workspace,
        Some(cancellation),
        request_or_group_id,
        single_run,
        &allowed_data_path,
        true, // enable detailed trace capture to get read/write data
    ));

    // Phase 5: Execute request (no locks held)
    let responses = context.run(vec![request_or_group_id.to_string()]).await;

    // Clean up cancellation token
    cancellation_tokens()
        .lock()
        .unwrap()
        .remove(request_or_group_id);

    // Phase 6: Process results with minimal lock scope
    match responses.into_iter().next() {
        Some(Ok(result)) => {
            let executed_request_ids = {
                let mut workspaces = workspaces_state.workspaces.write().await;
                let info = workspaces.get_workspace_info_mut(&workspace_id)?;
                let executing_request_ids = info
                    .get_running_request_ids()
                    .iter()
                    .filter(|id| id != &request_or_group_id)
                    .cloned()
                    .collect::<Vec<String>>();

                let requests_to_update = info.execution_results.process_result(&context, result);

                // info.execution_results.dump_current_indexes();

                requests_to_update
                    .iter()
                    .map(|request_id| {
                        let execution_menu = info.build_result_menu_items(request_id).unwrap();

                        let mut execution_state = ExecutionState::empty();

                        let active_summaries = info
                            .execution_results
                            .get_summaries(request_id, true)
                            .values()
                            .flatten()
                            .map(|s| {
                                let result_state = match s.success {
                                    ExecutionResultSuccess::Success => ExecutionState::SUCCESS,
                                    ExecutionResultSuccess::Failure => ExecutionState::FAILURE,
                                    ExecutionResultSuccess::Error => ExecutionState::ERROR,
                                };
                                execution_state |= result_state;
                                (s.exec_ctr, (*s).to_owned())
                            })
                            .collect::<IndexMap<usize, ExecutionResultSummary>>();

                        if executing_request_ids.contains(request_id) {
                            execution_state |= ExecutionState::RUNNING;
                        }

                        if let Some(nav) = info.get_navigation_mut(request_id) {
                            nav.execution_state = execution_state;
                        }

                        let execution = info.get_execution_mut(request_id);

                        execution.menu = execution_menu;
                        execution.execution_state = execution_state;
                        execution.active_summaries = active_summaries;

                        request_id.to_string()
                    })
                    .collect::<HashSet<String>>()
            };

            // Emit completion status outside of locks
            let workspaces = workspaces_state.workspaces.read().await;
            let info = workspaces.get_workspace_info(&workspace_id)?;

            let executed_requests = executed_request_ids
                .into_iter()
                .filter_map(|processed_request_id| {
                    if let Some(execution) = info.executions.get(&processed_request_id) {
                        let execution_event = ExecutionEvent::Complete(RequestExecution {
                            execution_state: execution.execution_state,
                            menu: execution.menu.clone(),
                            active_summaries: execution.active_summaries.clone(),
                        });
                        Some((processed_request_id, execution_event))
                    } else {
                        None
                    }
                })
                .collect::<HashMap<String, ExecutionEvent>>();

            if !executed_requests.is_empty() {
                for emit_to_session_id in &all_session_ids {
                    app.emit_to(emit_to_session_id, "execution_event", &executed_requests)
                        .unwrap();
                }
            }
            Ok(())
        }

        Some(Err(err)) => {
            // Quick write lock for error cleanup
            {
                let mut workspaces = workspaces_state.workspaces.write().await;
                let info = workspaces.get_workspace_info_mut(&workspace_id)?;
                let exec = info.get_execution_mut(request_or_group_id);
                exec.execution_state = previous_state;
                let abort_event = HashMap::from([(
                    request_or_group_id.to_string(),
                    ExecutionEvent::Cancel {
                        execution_state: previous_state,
                    },
                )]);

                for session_id in &all_session_ids {
                    app.emit_to(session_id, "execution_event", &abort_event)
                        .unwrap();
                }
            } // Write lock released immediately
            Err(ApicizeAppError::ApicizeError(err))
        }

        None => {
            // Quick cleanup for unexpected case
            {
                let mut workspaces = workspaces_state.workspaces.write().await;
                let info = workspaces.get_workspace_info_mut(&workspace_id)?;
                let exec = info.get_execution_mut(request_or_group_id);
                exec.execution_state = previous_state;
                let abort_event = HashMap::from([(
                    request_or_group_id.to_string(),
                    ExecutionEvent::Cancel {
                        execution_state: previous_state,
                    },
                )]);

                for session_id in &all_session_ids {
                    app.emit_to(session_id, "execution_event", &abort_event)
                        .unwrap();
                }
            } // Write lock released immediately
            Err(ApicizeAppError::NoResults)
        }
    }
}

#[tauri::command]
async fn cancel_execution(request_or_group_id: String) {
    let tokens = cancellation_tokens().lock().unwrap();
    if let Some(token) = tokens.get(&request_or_group_id) {
        token.cancel()
    }
}

#[tauri::command]
async fn get_execution(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_or_group_id: &str,
) -> Result<RequestExecution, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let mut workspaces = workspaces_state.workspaces.write().await;
    workspaces.get_execution(&session.workspace_id, request_or_group_id)
}

#[tauri::command]
async fn clear_execution(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_or_group_id: &str,
) -> Result<(), ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let mut workspaces = workspaces_state.workspaces.write().await;
    // Track of the request IDs associated with this execution (incl children) so we can trigger
    // an update on them all
    let all_request_ids = workspaces
        .get_execution(&session.workspace_id, request_or_group_id)?
        .active_summaries
        .values()
        .map(|s| s.request_or_group_id.to_string())
        .collect::<HashSet<String>>();

    // Clear the execution
    workspaces.clear_execution(&session.workspace_id, request_or_group_id)?;

    // Build clear events for all affected request and group IDs
    let info = workspaces.get_workspace_info(&session.workspace_id)?;
    let clear_event: HashMap<String, ExecutionEvent> = all_request_ids
        .into_iter()
        .map(|update_request_or_group_id| {
            let exec = info.build_request_execution(&update_request_or_group_id)?;
            Ok((update_request_or_group_id, ExecutionEvent::Clear(exec)))
        })
        .collect::<Result<_, ApicizeAppError>>()?;

    let all_session_ids = get_workspace_sessions(&session.workspace_id, &sessions, None)
        .unwrap_or_default()
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<String>>();
    for session_id in &all_session_ids {
        app.emit_to(session_id, "execution_event", &clear_event)
            .unwrap();
    }
    Ok(())
}

#[tauri::command]
async fn get_execution_result(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    exec_ctr: usize,
) -> Result<ExecutionResultDetail, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    workspaces.get_execution_result(&session.workspace_id, exec_ctr)
}

#[tauri::command]
async fn get_execution_result_view_state(
    sessions_state: State<'_, SessionsState>,
    session_id: &str,
    request_id: &str,
) -> Result<ExecutionResultViewState, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    Ok(session.get_execution_result_view_state(request_id).clone())
}

#[tauri::command]
async fn update_execution_result_view_state(
    sessions_state: State<'_, SessionsState>,
    session_id: &str,
    request_id: &str,
    execution_result_view_state: ExecutionResultViewState,
) -> Result<(), ApicizeAppError> {
    let mut sessions = sessions_state.sessions.write().await;
    let session = sessions.get_session_mut(session_id)?;
    session.update_execution_result_view_state(request_id, execution_result_view_state);
    Ok(())
}

#[tauri::command]
async fn store_token(authorization_id: String, token_info: CachedTokenInfo) {
    store_oauth2_token_in_cache(&authorization_id, token_info).await
}

#[tauri::command]
async fn clear_all_cached_authorizations() -> usize {
    clear_all_oauth2_tokens_from_cache().await
}

#[tauri::command]
async fn clear_cached_authorization(authorization_id: String) -> bool {
    clear_oauth2_token_from_cache(authorization_id.as_str()).await
}

#[tauri::command]
async fn retrieve_oauth2_client_token(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    authorization_id: &str,
) -> Result<TokenResult, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.write().await;
    let workspace = workspaces.get_workspace(&session.workspace_id)?;

    let auth = workspaces.get_authorization(&session.workspace_id, authorization_id)?;

    match auth {
        Authorization::OAuth2Client {
            id,
            access_token_url,
            client_id,
            client_secret,
            send_credentials_in_body,
            scope,
            audience,
            selected_certificate,
            selected_proxy,
            ..
        } => {
            let certificate = workspace
                .certificates
                .get_optional(&selected_certificate.map(|c| c.id));
            let proxy = workspace
                .proxies
                .get_optional(&selected_proxy.map(|p| p.id));

            clear_oauth2_token_from_cache(&id).await;
            Ok(get_oauth2_client_credentials(
                &id,
                &access_token_url,
                &client_id,
                &client_secret,
                send_credentials_in_body.unwrap_or_default(),
                &scope,
                &audience,
                certificate,
                proxy,
                true,
            )
            .await?)
        }
        _ => Err(ApicizeAppError::InvalidAuthorization(
            "Not an OAuth2 client authorization".to_string(),
        )),
    }
}

#[tauri::command]
async fn copy_to_clipboard(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    clipboard_state: State<'_, Clipboard>,
    settings_state: State<'_, SettingsState>,
    session_id: &str,
    payload_request: ClipboardPayloadRequest,
    // payload_type: &str,
) -> Result<(), ApicizeAppError> {
    let workspaces = workspaces_state.workspaces.read().await;
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let settings = settings_state.settings.read().await;
    let info = workspaces.get_workspace_info(&session.workspace_id)?;

    if let Some(payload) =
        info.get_clipboard_payload(payload_request, settings.editor_indent_size as usize)?
    {
        return match payload {
            PersistableData::Text(data) => clipboard_state.write_text(data),
            PersistableData::Binary(data) => clipboard_state.write_image_binary(data),
        }
        .map_err(ApicizeAppError::ClipboardError);
    }
    Ok(())
}

#[tauri::command]
async fn get_request_body(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_id: &str,
) -> Result<RequestBodyInfo, ApicizeAppError> {
    let mut workspaces = workspaces_state.workspaces.write().await;
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    workspaces.get_request_body(&session.workspace_id, request_id)
}

#[tauri::command]
async fn update_request_body(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_id: &str,
    body: RequestBody,
) -> Result<BodyMimeInfo, ApicizeAppError> {
    let mut workspaces = workspaces_state.workspaces.write().await;
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;

    let body_mime_type = Some(Workspaces::get_body_type(&body));
    let body_length = Some(Workspaces::get_body_length(&body));

    let body_info = RequestBodyInfo {
        id: request_id.to_string(),
        body: Some(body),
        body_mime_type: body_mime_type.clone(),
        body_length,
    };
    workspaces.update_request_body(&session.workspace_id, &body_info)?;

    let response = BodyMimeInfo {
        body_mime_type: body_info.body_mime_type.clone(),
        body_length: body_info.body_length,
    };

    // Publish updates on all other sessions than the one sending the update
    // so they can update themselves
    let other_sessions = get_workspace_sessions(&session.workspace_id, &sessions, Some(session_id));
    if let Some(other_session_ids) = other_sessions {
        // Publish updates on all other sessions than the one sending the update
        let notification = EntityUpdateNotification {
            update: EntityUpdate::Request(RequestUpdate::from_body_info(body_info)),
            validation_warnings: None,
            validation_errors: None,
        };

        for other_session_id in other_session_ids {
            app.emit_to(other_session_id, "update", &notification)
                .unwrap();
        }
    }

    let info = workspaces.get_workspace_info(&session.workspace_id)?;
    dispatch_save_state(&app, &sessions, &session.workspace_id, info, true);
    Ok(response)
}

#[tauri::command]
async fn update_request_body_from_clipboard(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    clipboard_state: State<'_, Clipboard>,
    session_id: &str,
    request_id: &str,
) -> Result<RequestBodyInfo, ApicizeAppError> {
    match clipboard_state.has_image() {
        Ok(has_image) => {
            if has_image {
                let mut workspaces = workspaces_state.workspaces.write().await;
                let sessions = sessions_state.sessions.read().await;
                let session = sessions.get_session(session_id)?;

                let data = clipboard_state
                    .read_image_binary()
                    .map_err(ApicizeAppError::ClipboardError)?;
                let body_length = Some(data.len());
                let body = RequestBody::Raw { data };
                let body_mime_type = Some(Workspaces::get_body_type(&body));
                let body_info = RequestBodyInfo {
                    id: request_id.to_string(),
                    body: Some(body),
                    body_mime_type,
                    body_length,
                };

                workspaces.update_request_body(&session.workspace_id, &body_info)?;

                let response = body_info.clone();

                // Publish updates on all other sessions than the one sending the update
                // so they can update themselves
                let other_sessions =
                    get_workspace_sessions(&session.workspace_id, &sessions, Some(session_id));
                if let Some(other_session_ids) = other_sessions {
                    let notification = EntityUpdateNotification {
                        update: EntityUpdate::Request(RequestUpdate::from_body_info(body_info)),
                        validation_warnings: None,
                        validation_errors: None,
                    };

                    for other_session_id in other_session_ids {
                        app.emit_to(other_session_id, "update", &notification)
                            .unwrap();
                    }
                }

                let info = workspaces.get_workspace_info(&session.workspace_id)?;
                dispatch_save_state(&app, &sessions, &session.workspace_id, info, true);
                Ok(response)
            } else {
                Err(ApicizeAppError::ClipboardError(String::from(
                    "Clipboard does not contain an image",
                )))
            }
        }
        Err(msg) => Err(ApicizeAppError::ClipboardError(msg)),
    }
}

#[tauri::command]
fn get_clipboard_file_data(paths: Vec<String>) -> Result<DroppedFile, String> {
    for file_path in paths {
        match exists(&file_path) {
            Ok(found) => {
                if found {
                    match fs::read(&file_path) {
                        Ok(data) => {
                            return Ok(DroppedFile::from_data(&file_path, data));
                        }
                        Err(err) => {
                            return Err(err.to_string());
                        }
                    }
                }
            }
            Err(err) => {
                return Err(err.to_string());
            }
        }
    }
    Err("Unable to locate dropped paths".to_string())
}

#[tauri::command]
fn set_pkce_port(state: State<'_, AuthState>, port: u16) {
    let mut pkce = state.pkce.lock().unwrap();
    pkce.activate_listener(port);
}

#[tauri::command]
fn generate_authorization_info(
    state: State<'_, AuthState>,
    auth: OAuth2PkceInfo,
    port: u16,
) -> Result<OAuth2PkceRequest, String> {
    let pkce = state.pkce.lock().unwrap();
    pkce.generate_authorization_info(auth, port)
}

// #[tauri::command]
// fn launch_pkce_window(
//     state: State<'_, AppState>,
//     auth: OAuth2PkceInfo,
//     port: u16,
// ) -> Result<OAuth2PkceRequest, String> {
//     let mut pkce = state.pkce.lock().unwrap();
//     pkce.launch_pkce_window(auth, port)
// }

#[tauri::command]
async fn retrieve_oauth2_pkce_token(
    token_url: &str,
    redirect_url: &str,
    code: &str,
    client_id: &str,
    verifier: &str,
) -> Result<PkceTokenResult, String> {
    OAuth2PkceService::retrieve_access_token(token_url, redirect_url, code, client_id, verifier)
        .await
}

#[tauri::command]
async fn refresh_token(
    token_url: &str,
    refresh_token: &str,
    client_id: &str,
) -> Result<PkceTokenResult, String> {
    OAuth2PkceService::refresh_token(token_url, refresh_token, client_id).await
}

#[tauri::command]
fn is_release_mode() -> bool {
    !cfg!(debug_assertions)
}

/// Retrieve other sessions for the updated workspace
fn get_workspace_sessions<'a>(
    workspace_id: &str,
    sessions: &'a Sessions,
    skip_session_id: Option<&str>,
) -> Option<Vec<&'a str>> {
    let results = sessions
        .sessions
        .iter()
        .filter_map(|(sid, s)| {
            if let Some(skip) = skip_session_id
                && skip == sid.as_str()
            {
                return None;
            }
            if workspace_id != s.workspace_id {
                None
            } else {
                Some(sid.as_str())
            }
        })
        .collect::<Vec<&str>>();
    match results.is_empty() {
        true => None,
        false => Some(results),
    }
}

#[tauri::command]
async fn get_request_active_authorization(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_id: &str,
) -> Result<Option<Authorization>, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    Ok(workspaces
        .get_request_active_authorization(&session.workspace_id, request_id)?
        .clone())
}

#[tauri::command]
async fn get_request_active_data(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_id: &str,
) -> Result<Option<DataSet>, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    Ok(workspaces
        .get_request_active_data(&session.workspace_id, request_id)?
        .clone())
}

#[tauri::command]
async fn get_data_set_content(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    data_set_id: &str,
) -> Result<Option<DataSetContent>, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    let info = workspaces.get_workspace_info(&session.workspace_id)?;
    Ok(info.data_set_content.get(data_set_id).cloned())
}

#[tauri::command]
async fn list_parameters(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    request_id: Option<&str>,
) -> Result<Entities, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    Ok(Entities::Parameters(
        workspaces.list_parameters(&session.workspace_id, request_id)?,
    ))
}

#[tauri::command]
async fn get(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    entity_type: EntityType,
    entity_id: &str,
) -> Result<Entity, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    Ok(match entity_type {
        EntityType::RequestEntry => {
            let workspaces = workspaces_state.workspaces.read().await;
            Entity::RequestEntry(workspaces.get_request_entry(&session.workspace_id, entity_id)?)
        }
        EntityType::Request => {
            let workspaces = workspaces_state.workspaces.read().await;
            if let RequestEntryInfo::Request { request } =
                workspaces.get_request_entry(&session.workspace_id, entity_id)?
            {
                Entity::Request(request)
            } else {
                return Err(ApicizeAppError::InvalidRequest(entity_id.to_string()));
            }
        }
        EntityType::Group => {
            let workspaces = workspaces_state.workspaces.read().await;
            if let RequestEntryInfo::Group { group } =
                workspaces.get_request_entry(&session.workspace_id, entity_id)?
            {
                Entity::Group(group)
            } else {
                return Err(ApicizeAppError::InvalidGroup(entity_id.to_string()));
            }
        }
        EntityType::Scenario => {
            let workspaces = workspaces_state.workspaces.read().await;
            Entity::Scenario(
                workspaces
                    .get_scenario(&session.workspace_id, entity_id)?
                    .clone(),
            )
        }
        EntityType::Authorization => {
            let workspaces = workspaces_state.workspaces.read().await;
            Entity::Authorization(workspaces.get_authorization(&session.workspace_id, entity_id)?)
        }
        EntityType::Certificate => {
            let workspaces = workspaces_state.workspaces.read().await;
            Entity::Certificate(workspaces.get_certificate(&session.workspace_id, entity_id)?)
        }
        EntityType::Proxy => {
            let workspaces = workspaces_state.workspaces.read().await;
            Entity::Proxy(
                workspaces
                    .get_proxy(&session.workspace_id, entity_id)?
                    .clone(),
            )
        }
        EntityType::DataSet => {
            let workspaces = workspaces_state.workspaces.read().await;
            Entity::DataSet(workspaces.get_data_set(&session.workspace_id, entity_id)?)
        }
        _ => {
            return Err(ApicizeAppError::InvalidTypeForOperation(entity_type));
        }
    })
}

#[tauri::command]
async fn update_active_entity(
    sessions_state: State<'_, SessionsState>,
    session_id: &str,
    entity: Option<SessionEntity>,
) -> Result<(), ApicizeAppError> {
    let mut sessions = sessions_state.sessions.write().await;
    let session = sessions.get_session_mut(session_id)?;
    session.update_active_entity(&entity);
    Ok(())
}

#[tauri::command]
async fn update_expanded_items(
    sessions_state: State<'_, SessionsState>,
    session_id: &str,
    ids: Option<Vec<String>>,
) -> Result<(), ApicizeAppError> {
    let mut sessions = sessions_state.sessions.write().await;
    let session = sessions.get_session_mut(session_id)?;
    session.expanded_items = ids;
    Ok(())
}

#[tauri::command]
async fn update_mode(
    sessions_state: State<'_, SessionsState>,
    session_id: &str,
    mode: u8, // WorkspaceMode,
) -> Result<(), ApicizeAppError> {
    let mut sessions = sessions_state.sessions.write().await;
    let session = sessions.get_session_mut(session_id)?;
    session.mode = WorkspaceMode::try_from(mode).map_err(ApicizeAppError::InvalidOperation)?;
    Ok(())
}

#[tauri::command]
async fn update_help_topic(
    sessions_state: State<'_, SessionsState>,
    session_id: &str,
    help_topic: Option<String>,
) -> Result<(), ApicizeAppError> {
    let mut sessions = sessions_state.sessions.write().await;
    let session = sessions.get_session_mut(session_id)?;
    session.help_topic = help_topic;
    Ok(())
}

#[tauri::command]
async fn get_title(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    entity_type: EntityType,
    entity_id: &str,
) -> Result<String, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    Ok(match entity_type {
        EntityType::RequestEntry => {
            workspaces.get_request_title(&session.workspace_id, entity_id)?
        }
        EntityType::Scenario => workspaces.get_scenario_title(&session.workspace_id, entity_id)?,
        EntityType::Authorization => {
            workspaces.get_authorization_title(&session.workspace_id, entity_id)?
        }
        EntityType::Certificate => {
            workspaces.get_certificate_title(&session.workspace_id, entity_id)?
        }
        EntityType::Proxy => workspaces.get_proxy_title(&session.workspace_id, entity_id)?,
        EntityType::DataSet => workspaces.get_data_title(&session.workspace_id, entity_id)?,
        _ => {
            return Err(ApicizeAppError::InvalidTypeForOperation(entity_type));
        }
    })
}

#[tauri::command]
async fn get_dirty(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
) -> Result<bool, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    workspaces.get_dirty(&session.workspace_id)
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
async fn add(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    entity_type: EntityType,
    relative_to_id: Option<&str>,
    relative_position: Option<IndexedEntityPosition>,
    clone_from_id: Option<&str>,
) -> Result<String, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspace_id = session.workspace_id.clone();
    let mut workspaces = workspaces_state.workspaces.write().await;

    let id = match entity_type {
        EntityType::Request => workspaces.add_request(
            &workspace_id,
            relative_to_id,
            relative_position,
            clone_from_id,
        ),
        EntityType::Group => workspaces.add_request_group(
            &workspace_id,
            relative_to_id,
            relative_position,
            clone_from_id,
        ),
        EntityType::Scenario => workspaces.add_scenario(
            &workspace_id,
            relative_to_id,
            relative_position,
            clone_from_id,
        ),
        EntityType::Authorization => workspaces.add_authorization(
            &workspace_id,
            relative_to_id,
            relative_position,
            clone_from_id,
        ),
        EntityType::Certificate => workspaces.add_certificate(
            &workspace_id,
            relative_to_id,
            relative_position,
            clone_from_id,
        ),
        EntityType::Proxy => workspaces.add_proxy(
            &workspace_id,
            relative_to_id,
            relative_position,
            clone_from_id,
        ),
        EntityType::DataSet => workspaces.add_data_set(
            &workspace_id,
            relative_to_id,
            relative_position,
            clone_from_id,
        ),
        _ => Err(ApicizeAppError::InvalidOperation(format!(
            "Unable to add {entity_type}",
        ))),
    }?;

    let info = workspaces.get_workspace_info_mut(&workspace_id)?;
    info.navigation = Navigation::new(&info.workspace, &info.executions);

    dispatch_save_state(&app, &sessions, &workspace_id, info, true);

    Ok(id)
}

#[tauri::command]
async fn update(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    entity_update: EntityUpdate,
) -> Result<UpdateResponse, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let mut workspaces = workspaces_state.workspaces.write().await;

    let other_sessions = get_workspace_sessions(&session.workspace_id, &sessions, Some(session_id));

    let result = match &entity_update {
        EntityUpdate::Request(request) => {
            workspaces.update_request(&session.workspace_id, request)?
        }
        EntityUpdate::RequestGroup(group) => {
            workspaces.update_group(&session.workspace_id, group)?
        }
        EntityUpdate::Scenario(scenario) => {
            workspaces.update_scenario(&session.workspace_id, scenario)?
        }
        EntityUpdate::Authorization(authorization) => {
            workspaces.update_authorization(&session.workspace_id, authorization)?
        }
        EntityUpdate::Certificate(certificate) => {
            workspaces.update_certificate(&session.workspace_id, certificate)?
        }
        EntityUpdate::Proxy(proxy) => workspaces.update_proxy(&session.workspace_id, proxy)?,
        EntityUpdate::DataSet(data_set) => {
            workspaces.update_data_set(&session.workspace_id, data_set)?
        }
        EntityUpdate::Defaults(defaults) => {
            let response = workspaces.update_defaults(&session.workspace_id, defaults)?;
            // Trigger an update so that requests and groups will update their default screens
            let workspace_session_ids =
                get_workspace_sessions(&session.workspace_id, &sessions, None);
            if let Some(session_ids) = workspace_session_ids {
                for session_id in session_ids {
                    if let Ok(session) = sessions.get_session(session_id)
                        && let Some(request_id) = match &session.active_entity {
                            Some(entity) => match entity.entity_type {
                                EntityType::Request => Some(entity.entity_id.clone()),
                                EntityType::Group => Some(entity.entity_id.clone()),
                                _ => None,
                            },
                            None => None,
                        }
                    {
                        let workspace = workspaces.get_workspace(&session.workspace_id)?;
                        match workspace.requests.entities.get(&request_id) {
                            Some(RequestEntry::Request(request)) => {
                                let notification = EntityUpdateNotification {
                                    update: EntityUpdate::Request(RequestUpdate::from_selections(
                                        request,
                                    )),
                                    validation_warnings: None,
                                    validation_errors: None,
                                };
                                app.emit_to(session_id, "update", notification).unwrap();
                            }
                            Some(RequestEntry::Group(group)) => {
                                let notification = EntityUpdateNotification {
                                    update: EntityUpdate::RequestGroup(
                                        RequestGroupUpdate::from_selections(group),
                                    ),
                                    validation_warnings: None,
                                    validation_errors: None,
                                };
                                app.emit_to(session_id, "update", notification).unwrap();
                            }
                            _ => {}
                        }
                    }
                }
            }
            response
        }
    };

    let info = &workspaces.get_workspace_info(&session.workspace_id)?;

    let display_name = &info.display_name;

    // Publish any navigation updates to all sessions/windows for this workspace
    if let Some(session_ids) = get_workspace_sessions(&session.workspace_id, &sessions, None) {
        for session_id in session_ids {
            if let Some(updated_navigation) = &result.navigation {
                app.emit_to(session_id, "navigation_entry", updated_navigation)
                    .unwrap();
            }
            app.emit_to(session_id, "dirty", true).unwrap();
            if let Some(w) = app.get_webview_window(session_id) {
                w.set_title(format_window_title(display_name, true).as_str())
                    .unwrap();
            }
        }
    }

    // Publish updates on all other sessions than the one sending the update
    if let Some(other_session_ids) = other_sessions {
        let notification = EntityUpdateNotification {
            update: entity_update,
            validation_warnings: result.validation_warnings.clone(),
            validation_errors: result.validation_errors.clone(),
        };

        for other_session_id in other_session_ids {
            println!(
                "Sending update to {}: {}",
                other_session_id,
                serde_json::to_string_pretty(&notification.update).unwrap()
            );
            app.emit_to(other_session_id, "update", &notification)
                .unwrap();
        }
    }

    dispatch_save_state(&app, &sessions, &session.workspace_id, info, false);

    Ok(UpdateResponse {
        validation_warnings: result.validation_warnings,
        validation_errors: result.validation_errors,
    })
}

#[tauri::command]
async fn delete(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    entity_type: EntityType,
    entity_id: &str,
) -> Result<(), ApicizeAppError> {
    let mut sessions = sessions_state.sessions.write().await;
    let mut workspaces = workspaces_state.workspaces.write().await;

    let workspace_id = sessions.get_session(session_id)?.workspace_id.to_string();

    let mut deleted_request = false;

    let entities_with_invalid_selections = match entity_type {
        EntityType::RequestEntry => {
            deleted_request = true;
            workspaces.delete_request_entry(&workspace_id, entity_id)
        }
        EntityType::Request => {
            deleted_request = true;
            workspaces.delete_request_entry(&workspace_id, entity_id)
        }
        EntityType::Group => {
            deleted_request = true;
            workspaces.delete_request_entry(&workspace_id, entity_id)
        }
        EntityType::Scenario => workspaces.delete_scenario(&workspace_id, entity_id),
        EntityType::Authorization => workspaces.delete_authorization(&workspace_id, entity_id),
        EntityType::Certificate => workspaces.delete_certificate(&workspace_id, entity_id),
        EntityType::Proxy => workspaces.delete_proxy(&workspace_id, entity_id),
        EntityType::DataSet => workspaces.delete_data_set(&workspace_id, entity_id),
        _ => Err(ApicizeAppError::InvalidOperation(
            "Unable to perform delete on entity".to_owned(),
        )),
    }?;

    // Collect notifications of requests/groups that had their selections updated
    let notifications = if let Some(entities) = entities_with_invalid_selections {
        entities
            .request_or_group_ids
            .iter()
            .filter_map(|id| {
                workspaces
                    .generate_request_selection_update(&workspace_id, id)
                    .ok()
            })
            .collect::<Vec<(EntityUpdateNotification, UpdatedNavigationEntry)>>()

        // request_ids_requiring_update
        //         .into_iter()
        //         .filter_map(|entity_id| {

        //             if entity_id != "Defaults"
        //                 && let Ok(notifications) =
        //                     workspaces.generate_request_selection_update(&workspace_id, &entity_id)
        //             {
        //                 Some(notifications)
        //             } else {
        //                 None
        //             }
        //         })
        //         .collect::<Vec<(EntityUpdateNotification, UpdatedNavigationEntry)>>();
    } else {
        Vec::default()
    };

    // Clear execution state for deleted requests/groups
    let info = workspaces.get_workspace_info_mut(&workspace_id)?;
    let deleted_executed_request_ids = if deleted_request {
        Some(info.delete_executions(entity_id))
    } else {
        None
    };

    // Update navigation for any updated entries
    notifications.iter().for_each(|(_update, navigation)| {
        info.navigation.update_navigation_entity(navigation);
    });

    // Clear active selection for any sessions with deleted entity
    // and trigger client-side cleanup of execution info
    sessions
        .get_workspace_session_ids(&workspace_id)
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<String>>()
        .into_iter()
        .for_each(|session_id| {
            notifications.iter().for_each(|(update, navigation)| {
                app.emit("update", update).unwrap();
                app.emit("navigation_entry", navigation).unwrap();
            });
            if let Ok(session) = sessions.get_session_mut(&session_id) {
                if session
                    .active_entity
                    .as_ref()
                    .is_some_and(|active| active.entity_id == entity_id)
                {
                    session.update_active_entity(&None);
                }
                if let Some(deleted_executed_request_ids) = &deleted_executed_request_ids {
                    for deleted_request_id in deleted_executed_request_ids {
                        session.remove_request_exec_ctr(deleted_request_id);
                        session.remove_execution_result_view_state(deleted_request_id);
                    }
                }
            }
        });

    dispatch_save_state(&app, &sessions, &workspace_id, info, true);
    Ok(())
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
async fn move_entity(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    entity_type: EntityType,
    entity_id: &str,
    relative_to_id: &str,
    relative_position: IndexedEntityPosition,
) -> Result<Vec<String>, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspace_id = session.workspace_id.clone();
    let mut workspaces = workspaces_state.workspaces.write().await;

    let was_moved = match entity_type {
        EntityType::RequestEntry => workspaces.move_request_entry(
            &workspace_id,
            entity_id,
            relative_to_id,
            relative_position,
        ),
        EntityType::Request => workspaces.move_request_entry(
            &workspace_id,
            entity_id,
            relative_to_id,
            relative_position,
        ),
        EntityType::Group => workspaces.move_request_entry(
            &workspace_id,
            entity_id,
            relative_to_id,
            relative_position,
        ),
        EntityType::Scenario => {
            workspaces.move_scenario(&workspace_id, entity_id, relative_to_id, relative_position)
        }
        EntityType::Authorization => workspaces.move_authorization(
            &workspace_id,
            entity_id,
            relative_to_id,
            relative_position,
        ),
        EntityType::Certificate => {
            workspaces.move_certificate(&workspace_id, entity_id, relative_to_id, relative_position)
        }
        EntityType::DataSet => {
            workspaces.move_data_set(&workspace_id, entity_id, relative_to_id, relative_position)
        }
        EntityType::Proxy => {
            workspaces.move_proxy(&workspace_id, entity_id, relative_to_id, relative_position)
        }
        _ => Err(ApicizeAppError::InvalidOperation(format!(
            "Unable to move {entity_type}",
        ))),
    }?;

    let results = if was_moved {
        let info = workspaces.get_workspace_info_mut(&workspace_id)?;
        info.navigation = Navigation::new(&info.workspace, &info.executions);

        dispatch_save_state(&app, &sessions, &workspace_id, info, true);

        workspaces.find_parent_ids(&workspace_id, entity_type, entity_id)?
    } else {
        vec![]
    };

    Ok(results)
}

#[tauri::command]
async fn list_logs() -> Result<Vec<ReqwestEvent>, ApicizeAppError> {
    match REQWEST_LOGGER.get() {
        Some(logger) => logger.get_logs(),
        None => Err(ApicizeAppError::ConcurrencyError(
            "Unable to access Reqwest logger".to_string(),
        )),
    }
}

#[tauri::command]
async fn clear_logs() -> Result<(), ApicizeAppError> {
    match REQWEST_LOGGER.get() {
        Some(logger) => logger.clear_logs(),
        None => Err(ApicizeAppError::ConcurrencyError(
            "Unable to access Reqwest logger".to_string(),
        )),
    }
}

#[tauri::command]
async fn get_entity_type(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    entity_id: &str,
) -> Result<Option<EntityType>, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    workspaces.get_entity_type(&session.workspace_id, entity_id)
}

#[tauri::command]
async fn find_descendant_groups(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    group_id: &str,
) -> Result<Vec<String>, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let workspaces = workspaces_state.workspaces.read().await;
    workspaces.find_descendent_groups(&session.workspace_id, group_id)
}

#[tauri::command]
async fn get_storage_information() -> StorageInformation {
    let globals_file_name = Parameters::get_globals_filename()
        .to_string_lossy()
        .to_string();
    let settings_file_name = ApicizeSettings::get_settings_filename()
        .to_string_lossy()
        .to_string();
    let settings_directory = ApicizeSettings::get_settings_directory()
        .to_string_lossy()
        .to_string();
    let home_directory = match home_dir() {
        Some(dir) => dir.to_string_lossy().to_string(),
        None => "(None)".to_string(),
    };
    let home_environment_variable = std::env::var("HOME").unwrap_or("(None)".to_string());

    StorageInformation {
        globals_file_name,
        settings_file_name,
        settings_directory,
        home_directory,
        home_environment_variable,
    }
}

#[tauri::command]
async fn open_data_set_file(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    data_set_id: &str,
) -> Result<OpenDataSetFileResponse, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let mut workspaces = workspaces_state.workspaces.write().await;
    let data_set = workspaces.get_data_set(&session.workspace_id, data_set_id)?;
    let data_source_type = data_set.source_type;
    let source = data_set.source;

    // If the data set is JSON, we probably shouldn't be calling this, but provide this as a backstop
    if data_source_type == DataSourceType::JSON {
        return Ok(OpenDataSetFileResponse {
            relative_file_name: "".to_string(),
            data_set_content: Some(DataSetContent {
                csv_columns: None,
                csv_rows: None,
                source_text: Some(source.clone()),
                dirty: false,
            }),
            validation_errors: data_set.validation_errors.clone(),
        });
    }

    let info = workspaces.get_workspace_info_mut(&session.workspace_id)?;

    // Return cached data set content if it exists
    if let Some(content) = info.data_set_content.get(data_set_id) {
        return Ok(OpenDataSetFileResponse {
            relative_file_name: source.clone(),
            data_set_content: Some(content.clone()),
            validation_errors: data_set.validation_errors.clone(),
        });
    }

    if data_source_type == DataSourceType::JSON {
        return Err(ApicizeAppError::InvalidOperation(
            "Cannot load external file for workbook data set".to_string(),
        ));
    }

    if source.is_empty() {
        return Err(ApicizeAppError::FileNameRequired());
    }

    let info = workspaces.get_workspace_info_mut(&session.workspace_id)?;

    let allowed_data_path: PathBuf = if info.file_name.is_empty() {
        return Err(ApicizeAppError::FileNameRequired());
    } else {
        std::path::absolute(&info.file_name)
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf()
    };

    let absolute_file_name =
        get_existing_absolute_file_name(&source, &Some(allowed_data_path.clone()))?;

    let relative_file_name =
        if let Some(relative_file_name) = diff_paths(&absolute_file_name, &allowed_data_path) {
            relative_file_name.to_string_lossy().to_string()
        } else {
            source.to_string()
        };

    workspaces.load_data_set_from_file(
        &session.workspace_id,
        data_set_id,
        &absolute_file_name,
        &relative_file_name,
    )
}

#[tauri::command]
async fn open_data_set_file_from(
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    data_set_id: &str,
    file_name: &str,
) -> Result<Option<OpenDataSetFileResponse>, ApicizeAppError> {
    let sessions = sessions_state.sessions.read().await;
    let session = sessions.get_session(session_id)?;
    let mut workspaces = workspaces_state.workspaces.write().await;
    let info = workspaces.get_workspace_info_mut(&session.workspace_id)?;

    let allowed_data_path: PathBuf = if info.file_name.is_empty() {
        return Err(ApicizeAppError::FileNameRequired());
    } else {
        std::path::absolute(&info.file_name)
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf()
    };

    let absolute_file_name =
        get_existing_absolute_file_name(file_name, &Some(allowed_data_path.clone()))?;

    let relative_file_name =
        if let Some(relative_file_name) = diff_paths(&absolute_file_name, &allowed_data_path) {
            relative_file_name.to_string_lossy().to_string()
        } else {
            file_name.to_string()
        };

    info.check_for_conflicting_data_set_file(&relative_file_name, data_set_id)?;

    Ok(Some(workspaces.load_data_set_from_file(
        &session.workspace_id,
        data_set_id,
        &absolute_file_name,
        &relative_file_name,
    )?))
}

#[tauri::command]
async fn save_data_set_file(
    app: AppHandle,
    sessions_state: State<'_, SessionsState>,
    workspaces_state: State<'_, WorkspacesState>,
    session_id: &str,
    data_set_id: &str,
    file_name: &str,
) -> Result<String, ApicizeAppError> {
    let relative_file_name: String;
    let allowed_data_path: PathBuf;

    // Confirm that the requested file name is valid
    {
        let sessions = sessions_state.sessions.read().await;
        let session = sessions.get_session(session_id)?;
        let workspaces = workspaces_state.workspaces.read().await;
        let info = workspaces.get_workspace_info(&session.workspace_id)?;

        allowed_data_path = if info.file_name.is_empty() {
            return Err(ApicizeAppError::FileNameRequired());
        } else {
            std::path::absolute(&info.file_name)
                .unwrap()
                .parent()
                .unwrap()
                .to_path_buf()
        };

        let file_path = PathBuf::from(file_name);
        relative_file_name = get_relative_file_name(&file_path, &allowed_data_path)?;

        info.check_for_conflicting_data_set_file(&relative_file_name, data_set_id)?;
    }

    // Carry on with the save...
    {
        let sessions = sessions_state.sessions.read().await;
        let session = sessions.get_session(session_id)?;
        let mut workspaces = workspaces_state.workspaces.write().await;
        let info = workspaces.get_workspace_info_mut(&session.workspace_id)?;

        let Some(data_set) = info.workspace.data.get_mut(data_set_id) else {
            return Err(ApicizeAppError::InvalidDataSet(format!(
                "Invalid data set ID {data_set_id}"
            )));
        };
        let Some(content) = info.data_set_content.get_mut(data_set_id) else {
            return Err(ApicizeAppError::InvalidDataSet(format!(
                "No content for data set ID {data_set_id}"
            )));
        };

        let old_source = data_set.source.to_string();
        data_set.source = relative_file_name.to_string();

        // Save the data to ensure that the file name is valid, if we can't save, revert
        if let Err(err) = perform_save_data_set_file(data_set, content, &allowed_data_path, true) {
            data_set.source = old_source;
            return Err(err);
        }
    }

    // Broadcast the update
    let entity_update = EntityUpdate::DataSet(DataSetUpdate {
        id: data_set_id.to_string(),
        entity_type: EntityType::DataSet,
        name: None,
        source_type: None,
        source_file_name: Some(relative_file_name.to_string()),
        source_text: None,
        csv_columns: None,
        csv_rows: None,
    });

    update(
        app,
        sessions_state,
        workspaces_state,
        session_id,
        entity_update,
    )
    .await?;

    Ok(relative_file_name)
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageInformation {
    settings_file_name: String,
    globals_file_name: String,
    home_directory: String,
    home_environment_variable: String,
    settings_directory: String,
}
