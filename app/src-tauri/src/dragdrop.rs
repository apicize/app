use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase")]
#[serde(tag = "type")]
pub enum DroppedFile {
    Text {
        data: String,
        extension: String,
        file_name: String,
    },
    Binary {
        data: Vec<u8>,
        extension: String,
        file_name: String,
    },
}

impl DroppedFile {
    pub fn from_data(file_path: &String, data: Vec<u8>) -> DroppedFile {
        let path = Path::new(&file_path);
        let extension = match path.extension() {
            Some(ext) => ext.to_ascii_lowercase().to_string_lossy().to_string(),
            None => "".to_string(),
        };
        let file_name = match path.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => "".to_string(),
        };

        let len = data.len();
        if len < 64 * 1024 * 1024 {
            let mut parsed: Option<String> = None;
            if data.starts_with(&[0xEF, 0xBB, 0xBF]) {
                parsed = Some(String::from_utf8_lossy(&data).to_string());
            } else if data.starts_with(&[0xFF, 0xFE]) {
                if len.is_multiple_of(2) {
                    let iter =
                        (0..len / 2).map(|i| u16::from_le_bytes([data[2 * i], data[2 * i + 1]]));
                    parsed = Some(String::from_utf16_lossy(&iter.collect::<Vec<u16>>()));
                }
            } else if data.starts_with(&[0xFE, 0xFF]) {
                if len.is_multiple_of(2) {
                    let iter =
                        (0..len / 2).map(|i| u16::from_be_bytes([data[2 * i], data[2 * i + 1]]));
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
                    file_name,
                };
            }
        }

        DroppedFile::Binary {
            data,
            extension,
            file_name,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_data_decodes_utf16_le() {
        let data = vec![0xFF, 0xFE, b'h', 0, b'i', 0];
        match DroppedFile::from_data(&"test.txt".to_string(), data) {
            DroppedFile::Text {
                data,
                extension,
                file_name,
            } => {
                assert_eq!(data, "\u{FEFF}hi");
                assert_eq!(extension, "txt");
                assert_eq!(file_name, "test.txt");
            }
            DroppedFile::Binary { .. } => panic!("Expected text"),
        }
    }

    #[test]
    fn serializes_file_name_as_camel_case() {
        let file = DroppedFile::from_data(&"/tmp/data.bin".to_string(), vec![0x80, 0x81, 0xFF]);
        let json = serde_json::to_value(&file).unwrap();
        assert_eq!(json["type"], "binary");
        assert_eq!(json["fileName"], "data.bin");
    }

    #[test]
    fn from_data_decodes_utf16_be() {
        let data = vec![0xFE, 0xFF, 0, b'h', 0, b'i'];
        match DroppedFile::from_data(&"test.txt".to_string(), data) {
            DroppedFile::Text { data, .. } => assert_eq!(data, "\u{FEFF}hi"),
            DroppedFile::Binary { .. } => panic!("Expected text"),
        }
    }
}
