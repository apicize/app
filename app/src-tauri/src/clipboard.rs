use apicize_lib::{Authorization, Certificate, Proxy, Scenario, StoredRequestEntry};
use arboard::{Clipboard, ImageData};
use clipboard_rs::{ClipboardHandler, ClipboardWatcher, ClipboardWatcherContext, WatcherShutdown};
use image::{DynamicImage, ImageBuffer, ImageFormat, RgbaImage};
use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::{io::Cursor, sync::Arc, thread, time::Duration};
use tauri::{AppHandle, Emitter};

use crate::error::ApicizeAppError;

pub struct ClipboardState {
    clipboard: Arc<Mutex<Clipboard>>,
    data: Arc<RwLock<Option<ClipboardData>>>,
    data_type: Arc<RwLock<ClipboardDataType>>,
    _watcher_shutdown: WatcherShutdown,
}

impl ClipboardState {
    pub fn new(app: AppHandle) -> Self {
        let clipboard = Arc::new(Mutex::new(Clipboard::new().unwrap()));
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
            _watcher_shutdown: watcher_shutdown,
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
        let mut clipboard = self
            .clipboard
            .try_lock_for(Duration::from_secs(1))
            .ok_or_else(|| {
                ApicizeAppError::ClipboardError("Failed to acquire clipboard lock".into())
            })?;

        let img = clipboard
            .get_image()
            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))?;

        image_data_to_png_bytes(img)
    }

    pub fn set_text(&self, text: String) -> Result<(), ApicizeAppError> {
        let mut clipboard = self
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
        let image = png_bytes_to_image_data(&data)?;

        let mut clipboard = self
            .clipboard
            .try_lock_for(Duration::from_secs(1))
            .ok_or_else(|| {
                ApicizeAppError::ClipboardError("Failed to acquire clipboard lock".into())
            })?;

        clipboard
            .set_image(image)
            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))
    }
}

// Convert PNG bytes to ImageData
fn png_bytes_to_image_data(bytes: &[u8]) -> Result<ImageData<'static>, ApicizeAppError> {
    let img = image::load_from_memory(bytes)
        .map_err(|e| ApicizeAppError::ClipboardError(format!("Failed to load image: {}", e)))?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    Ok(ImageData {
        width: width as usize,
        height: height as usize,
        bytes: rgba.into_raw().into(),
    })
}

// Convert ImageData to PNG bytes
fn image_data_to_png_bytes(img: ImageData) -> Result<Vec<u8>, ApicizeAppError> {
    let rgba_img: RgbaImage = ImageBuffer::from_vec(
        img.width as u32,
        img.height as u32,
        img.bytes.into_owned(),
    )
    .ok_or_else(|| ApicizeAppError::ClipboardError("Invalid image dimensions".into()))?;

    let dynamic = DynamicImage::ImageRgba8(rgba_img);
    let mut bytes = Vec::new();
    dynamic
        .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
        .map_err(|e| ApicizeAppError::ClipboardError(format!("PNG encoding failed: {}", e)))?;
    Ok(bytes)
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
        // Create a new Clipboard instance for the watcher
        // (we can't share the one in ClipboardState due to &mut requirement)
        let mut clipboard = match Clipboard::new() {
            Ok(cb) => cb,
            Err(_) => return,
        };

        // Check for image FIRST before text, since on Linux/X11 images often have
        // both image data and text (file path) in clipboard, and we want to detect
        // the image format
        let new_data = if clipboard.get_image().is_ok() {
            Some(ClipboardData::Image)
        } else if let Ok(text) = clipboard.get_text() {
            if text.is_empty() {
                None
            } else if let Ok(data) = serde_json::from_str::<ClipboardData>(&text) {
                Some(data)
            } else {
                Some(ClipboardData::Text { text })
            }
        } else {
            // Note: arboard doesn't have a direct get_files() method
            // Files are typically represented as text paths on most platforms
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
