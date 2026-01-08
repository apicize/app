use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub enum DroppedFile {
    Text { data: String, extension: String },
    Binary { data: Vec<u8>, extension: String },
}

impl DroppedFile {
    pub fn from_data(file_path: &String, data: Vec<u8>) -> DroppedFile {
        let path = Path::new(&file_path);
        let extension = match path.extension() {
            Some(ext) => ext.to_ascii_lowercase().to_string_lossy().to_string(),
            None => "".to_string(),
        };

        let len = data.len();
        if len < 64 * 1024 * 1024 {
            let mut parsed: Option<String> = None;
            if data.starts_with(&[0xEF, 0xBB, 0xBF]) {
                parsed = Some(String::from_utf8_lossy(&data).to_string());
            } else if data.starts_with(&[0xFF, 0xFE]) {
                if len.is_multiple_of(2) {
                    let iter = (0..len).map(|i| u16::from_le_bytes([data[2 * i], data[2 * i + 1]]));
                    parsed = Some(String::from_utf16_lossy(&iter.collect::<Vec<u16>>()));
                }
            } else if data.starts_with(&[0xFE, 0xFF]) {
                if len.is_multiple_of(2) {
                    let iter = (0..len).map(|i| u16::from_be_bytes([data[2 * i], data[2 * i + 1]]));
                    parsed = Some(String::from_utf16_lossy(&iter.collect::<Vec<u16>>()));
                }
            } else {
                // If the first 1k and last 1k do not contain non-ASCII chars, assume we have text
                if data.is_ascii() {
                    parsed = Some(String::from_utf8_lossy(&data).to_string())
                }
            }

            if let Some(text) = parsed {
                return DroppedFile::Text {
                    data: text,
                    extension,
                };
            }
        }

        DroppedFile::Binary { data, extension }
    }
}
