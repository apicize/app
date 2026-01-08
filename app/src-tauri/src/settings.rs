//! Settings models submodule
//!
//! This submodule defines models used to store application settings

use std::{
    fs::create_dir_all,
    path::{self, Path},
};

use apicize_lib::{
    ExecutionReportFormat, SerializationOpenSuccess, SerializationSaveSuccess, open_data_file,
    save_data_file,
};
use dirs::{config_dir, document_dir, home_dir};
use serde::{Deserialize, Serialize};

use crate::error::ApicizeAppError;

fn default_font_size() -> i32 {
    12
}

fn default_color_scheme() -> ColorScheme {
    ColorScheme::Dark
}

fn default_pkce_listener_port() -> u16 {
    8080
}

fn default_editor_indent_size() -> u8 {
    4
}

fn default_true() -> bool {
    true
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
/// Color scheme for UI app
pub enum ColorScheme {
    /// Light mode
    Light,
    /// Dark mode
    Dark,
}

pub struct ApicizeWindowState {}

/// Apicize application settings
#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApicizeSettings {
    /// Default directory that workbooks are stored in
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workbook_directory: Option<String>,

    /// Last opened/saved workbook name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_workbook_file_name: Option<String>,

    /// Font Size
    #[serde(default = "default_font_size")]
    pub font_size: i32,

    /// Font Size
    #[serde(default = "default_font_size")]
    pub navigation_font_size: i32,

    /// Color scheme for UI app
    #[serde(default = "default_color_scheme")]
    pub color_scheme: ColorScheme,

    #[serde(default)]
    /// Layout for editor panels (UI)
    pub editor_panels: String,

    #[serde(default)]
    /// Layout for editor panels (UI)
    pub report_format: ExecutionReportFormat,

    /// Recent workbook file names opened in UI
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recent_workbook_file_names: Option<Vec<String>>,

    /// Port for UI PKCE listener
    #[serde(default = "default_pkce_listener_port")]
    pub pkce_listener_port: u16,

    /// Always hide navigation tree
    #[serde(default)]
    pub always_hide_nav_tree: bool,

    /// Display diagnostic info like IDs
    #[serde(default)]
    pub show_diagnostic_info: bool,

    /// Tab indent
    #[serde(default = "default_editor_indent_size")]
    pub editor_indent_size: u8,

    /// Tab indent
    #[serde(default = "default_true")]
    pub editor_detect_existing_indent: bool,

    /// Tab indent
    #[serde(default = "default_true")]
    pub editor_check_js_syntax: bool,
}

impl ApicizeSettings {
    /// Return default workbooks directory
    pub fn get_workbooks_directory() -> path::PathBuf {
        if let Some(directory) = document_dir() {
            directory.join("apicize")
        } else if let Some(directory) = home_dir() {
            directory.join("apicize")
        } else {
            panic!("Operating system did not provide document or home directory")
        }
    }

    pub fn get_settings_directory() -> path::PathBuf {
        if let Some(directory) = config_dir() {
            directory.join("apicize")
        } else {
            panic!("Operating system did not provide configuration directory")
        }
    }

    /// Return the file name for settings
    pub fn get_settings_filename() -> path::PathBuf {
        Self::get_settings_directory().join("settings.json")
    }

    /// Update the recently used work book file names and last workbook settings,
    /// returns True if either changed
    pub fn update_recent_workbook_file_name(&mut self, file_name: &str) -> bool {
        let mut changed = false;
        let cloned_filename = Some(file_name.to_string());
        if cloned_filename != self.last_workbook_file_name {
            self.last_workbook_file_name = cloned_filename;
            changed = true;
        }

        match self.recent_workbook_file_names.as_mut() {
            Some(recent) => {
                if changed && recent.len() > 9 {
                    recent.truncate(9);
                }
                match recent.iter().position(|r| r == file_name) {
                    Some(index) => {
                        if index != 0 {
                            recent.remove(index);
                            recent.insert(0, file_name.to_string());
                        }
                    }
                    None => {
                        recent.push(file_name.to_string());
                        changed = true;
                    }
                }
            }
            None => {
                self.recent_workbook_file_names = Some(vec![file_name.to_string()]);
                changed = true
            }
        }

        changed
    }

    /// Open Apicize common environment from the specified name in the default path
    pub fn open() -> Result<SerializationOpenSuccess<ApicizeSettings>, ApicizeAppError> {
        let file_name = &Self::get_settings_filename();
        if Path::new(&file_name).is_file() {
            open_data_file::<ApicizeSettings>(&Self::get_settings_filename())
                .map_err(ApicizeAppError::ApicizeError)
        } else {
            // Return default settings if no existing settings file exists
            let settings = ApicizeSettings {
                last_workbook_file_name: None,
                workbook_directory: Some(String::from(
                    Self::get_workbooks_directory().to_string_lossy(),
                )),
                font_size: 12,
                navigation_font_size: 12,
                color_scheme: ColorScheme::Dark,
                editor_panels: String::from(""),
                recent_workbook_file_names: None,
                pkce_listener_port: 8080,
                always_hide_nav_tree: false,
                show_diagnostic_info: false,
                report_format: ExecutionReportFormat::JSON,
                editor_indent_size: 3,
                editor_check_js_syntax: true,
                editor_detect_existing_indent: true,
            };
            Ok(SerializationOpenSuccess {
                file_name: String::from(""),
                data: settings,
            })
        }
    }

    /// Save Apicize common environment to the specified name in the default path
    pub fn save(&self) -> Result<SerializationSaveSuccess, ApicizeAppError> {
        let dir = Self::get_settings_directory();
        if !Path::new(&dir).is_dir()
            && let Err(err) = create_dir_all(&dir)
        {
            panic!("Unable to create {} - {}", &dir.to_string_lossy(), err);
        }
        save_data_file(&Self::get_settings_filename(), self).map_err(ApicizeAppError::ApicizeError)
    }
}
