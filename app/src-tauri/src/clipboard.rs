use apicize_lib::{Authorization, Certificate, Proxy, Scenario, StoredRequestEntry};
use clipboard_rs::{
    common::RustImage, Clipboard, ClipboardContext, ClipboardHandler, ClipboardWatcher,
    ClipboardWatcherContext, WatcherShutdown,
};
use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::{sync::Arc, thread, time::Duration};
use tauri::{AppHandle, Emitter};

use crate::error::ApicizeAppError;

pub struct ClipboardState {
    clipboard: Arc<Mutex<ClipboardContext>>,
    data: Arc<RwLock<Option<ClipboardData>>>,
    data_type: Arc<RwLock<ClipboardDataType>>,
    _watcher_shutdown: Arc<Mutex<WatcherShutdown>>,
}

impl ClipboardState {
    pub fn new(app: AppHandle) -> Self {
        let clipboard = Arc::new(Mutex::new(ClipboardContext::new().unwrap()));
        let data = Arc::new(RwLock::<Option<ClipboardData>>::new(None));
        let data_type = Arc::new(RwLock::<ClipboardDataType>::new(ClipboardDataType::None));
        let manager = ClipboardManager::new(app, data.clone(), data_type.clone());
        let mut watcher = ClipboardWatcherContext::new().unwrap();

        let watcher_shutdown = watcher.add_handler(manager).get_shutdown_channel();

        thread::spawn(move || {
            watcher.start_watch();
        });

        ClipboardState {
            clipboard,
            data,
            data_type,
            _watcher_shutdown: Arc::new(Mutex::new(watcher_shutdown)),
        }
    }

    pub fn get_data_type(&self) -> ClipboardDataType {
        if let Some(data_type) = self.data_type.try_read_for(Duration::from_secs(1)) {
            *data_type
        } else {
            ClipboardDataType::None
        }
    }

    pub fn get_data(&self) -> Option<ClipboardData> {
        if let Some(data) = &self.data.try_read_for(Duration::from_secs(1)) {
            (*data).clone()
        } else {
            None
        }
    }

    pub fn read_image(&self) -> Result<Vec<u8>, ApicizeAppError> {
        let clipboard = self
            .clipboard
            .try_lock_for(Duration::from_secs(1))
            .ok_or_else(|| {
                ApicizeAppError::ClipboardError("Failed to acquire clipboard lock".into())
            })?;

        let img = clipboard
            .get_image()
            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))?;

        let png = img
            .to_png()
            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))?;

        Ok(png.get_bytes().to_vec())
    }

    pub fn set_text(&self, text: String) -> Result<(), ApicizeAppError> {
        let clipboard = self
            .clipboard
            .try_lock_for(Duration::from_secs(1))
            .ok_or_else(|| {
                ApicizeAppError::ClipboardError("Failed to acquire clipboard lock".into())
            })?;

        clipboard
            .set_text(text)
            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))
    }

    pub fn set_image(&self, data: Vec<u8>) -> Result<(), ApicizeAppError> {
        let clipboard = self
            .clipboard
            .try_lock_for(Duration::from_secs(1))
            .ok_or_else(|| {
                ApicizeAppError::ClipboardError("Failed to acquire clipboard lock".into())
            })?;

        use clipboard_rs::common::RustImageData;
        let img = RustImageData::from_bytes(&data)
            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))?;

        clipboard
            .set_image(img)
            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))
    }
}

struct ClipboardManager {
    app: AppHandle,
    data: Arc<RwLock<Option<ClipboardData>>>,
    data_type: Arc<RwLock<ClipboardDataType>>,
}

impl ClipboardManager {
    pub fn new(
        app: AppHandle,
        data: Arc<RwLock<Option<ClipboardData>>>,
        data_type: Arc<RwLock<ClipboardDataType>>,
    ) -> Self {
        ClipboardManager {
            app,
            data,
            data_type,
        }
    }
}

#[derive(Debug)]
pub struct ClipboardError {
    pub message: String,
}

impl ClipboardHandler for ClipboardManager {
    fn on_clipboard_change(&mut self) {
        // Create a new ClipboardContext instance for the watcher
        // (we can't share the one in ClipboardState due to &mut requirement)
        let clipboard = match ClipboardContext::new() {
            Ok(cb) => cb,
            Err(_) => return,
        };

        // Check for image FIRST, then files, then text, since on Linux/X11 images often have
        // both image data and text (file path) in clipboard, and we want to detect
        // the image format
        let new_data = if clipboard.get_image().is_ok() {
            Some(ClipboardData::Image)
        } else if let Ok(files) = clipboard.get_files() {
            if !files.is_empty() {
                Some(ClipboardData::Files { files })
            } else {
                None
            }
        } else if let Ok(text) = clipboard.get_text() {
            if text.is_empty() {
                None
            } else if let Ok(data) = serde_json::from_str::<ClipboardData>(&text) {
                Some(data)
            } else {
                Some(ClipboardData::Text { text })
            }
        } else {
            None
        };

        if let Some(new_data) = new_data {
            let new_data_type = ClipboardDataType::from(&new_data);

            if let Some(mut data_type) = self.data_type.try_write_for(Duration::from_secs(5))
                && let Some(mut data) = self.data.try_write_for(Duration::from_secs(5))
            {
                *data_type = new_data_type;
                *data = Some(new_data);
                self.app
                    .emit("clipboard_changed", new_data_type)
                    .unwrap_or_else(|err| eprintln!("Unable to emit clipboard event: {err}"));
            }
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum ClipboardData {
    Text { text: String },
    Image,
    Files { files: Vec<String> },
    RequestEntry { entry: Box<StoredRequestEntry> },
    Scenario { scenario: Box<Scenario> },
    Authorization { authorization: Box<Authorization> },
    Certificate { certificate: Box<Certificate> },
    Proxy { proxy: Box<Proxy> },
}

#[derive(Serialize_repr, Deserialize_repr, Copy, Clone, PartialEq)]
#[repr(u8)]
pub enum ClipboardDataType {
    None = 0,
    Text = 1,
    Image = 2,
    Files = 3,
    RequestEntry = 4,
    Scenario = 5,
    Authorization = 6,
    Certificate = 7,
    Proxy = 8,
}

impl From<&ClipboardData> for ClipboardDataType {
    fn from(value: &ClipboardData) -> Self {
        match value {
            ClipboardData::Text { .. } => ClipboardDataType::Text,
            ClipboardData::Image => ClipboardDataType::Image,
            ClipboardData::Files { .. } => ClipboardDataType::Files,
            ClipboardData::RequestEntry { .. } => ClipboardDataType::RequestEntry,
            ClipboardData::Scenario { .. } => ClipboardDataType::Scenario,
            ClipboardData::Authorization { .. } => ClipboardDataType::Authorization,
            ClipboardData::Certificate { .. } => ClipboardDataType::Certificate,
            ClipboardData::Proxy { .. } => ClipboardDataType::Proxy,
        }
    }
}
