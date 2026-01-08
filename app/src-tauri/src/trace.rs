use std::sync::{Arc, RwLock};

use chrono::Local;
use log::{Metadata, Record};
use regex::Regex;
use serde::Serialize;
use tauri::{AppHandle, Emitter, async_runtime::Sender};
use tokio::sync::mpsc;

use crate::error::ApicizeAppError;

pub struct ReqwestLogger {
    regex_readwrite: Regex,
    regex_connect: Regex,
    app: AppHandle,
    event_sender: Sender<ReqwestEvent>,
    stored_log: Arc<RwLock<Vec<ReqwestEvent>>>,
}

#[derive(Serialize, Clone)]
pub struct ReqwestEventConnect {
    pub timestamp: String,
    pub host: String,
}

#[derive(Serialize, Clone)]
pub struct ReqwestEventRead {
    pub timestamp: String,
    pub id: String,
    pub data: String,
}

#[derive(Serialize, Clone)]
pub struct ReqwestEventWrite {
    pub timestamp: String,
    pub id: String,
    pub data: String,
}

#[derive(Serialize, Clone)]
#[serde(tag = "event")]
pub enum ReqwestEvent {
    Connect(ReqwestEventConnect),
    Read(ReqwestEventRead),
    Write(ReqwestEventWrite),
    Clear,
}

impl ReqwestLogger {
    pub fn new(app: AppHandle) -> Self {
        let (event_sender, mut event_receiver) = mpsc::channel::<ReqwestEvent>(50);

        let stored_log = Arc::new(RwLock::new(vec![]));
        let cloned_stored_log = stored_log.clone();
        let cloned_app = app.clone();

        tokio::spawn(async move {
            loop {
                if let Some(event) = event_receiver.recv().await {
                    cloned_app.emit("log", &event).unwrap();
                    let mut log = cloned_stored_log.write().unwrap();
                    while log.len() > 99 {
                        log.remove(0);
                    }
                    log.push(event);
                }
            }
        });

        ReqwestLogger {
            regex_readwrite: Regex::new(r#"^([0-9a-f]+) (read|write): b"(.*)"$"#).unwrap(),
            regex_connect: Regex::new(r#"starting new connection: (.*)"#).unwrap(),
            event_sender,
            app,
            stored_log,
        }
    }

    pub fn get_logs(&self) -> Result<Vec<ReqwestEvent>, ApicizeAppError> {
        match self.stored_log.read() {
            Ok(logs) => Ok(logs.to_vec()),
            Err(e) => Err(ApicizeAppError::ConcurrencyError(e.to_string())),
        }
    }

    pub fn clear_logs(&self) -> Result<(), ApicizeAppError> {
        match self.stored_log.write() {
            Ok(mut logs) => {
                logs.clear();
                self.app.emit("log", ReqwestEvent::Clear).unwrap();
                Ok(())
            }
            Err(e) => Err(ApicizeAppError::ConcurrencyError(e.to_string())),
        }
    }
}

impl log::Log for ReqwestLogger {
    fn enabled(&self, _: &Metadata) -> bool {
        true
    }

    fn log(&self, record: &Record) {
        let target = record.target();
        if target == "reqwest::connect" {
            let args = record.args().to_string();
            if let Some(result) = self.regex_connect.captures(&args)
                && let Some(host) = result.get(1)
            {
                let event = ReqwestEvent::Connect(ReqwestEventConnect {
                    timestamp: Local::now().format("%H:%M:%S%.3f").to_string(),
                    host: host.as_str().to_string(),
                });
                self.event_sender.try_send(event).unwrap();
                // self.app.emit("log", &event).unwrap();
                // self.event_sender.blocking_send(event).unwrap();
            }
        } else if target == "reqwest::connect::verbose" {
            let args = record.args().to_string();
            if let Some(result) = self.regex_readwrite.captures(&args)
                && let Some(request_id) = result.get(1)
                && let Some(operation) = result.get(2)
                && let Some(data) = result.get(3)
            {
                match operation.as_str() {
                    "read" => {
                        let event = ReqwestEvent::Read(ReqwestEventRead {
                            timestamp: Local::now().format("%H:%M:%S%.3f").to_string(),
                            id: request_id.as_str().to_string(),
                            data: String::from(data.as_str())
                                .replace("\\r\\n", "\r\n")
                                .replace("\\n", "\n"),
                        });
                        self.event_sender.try_send(event).unwrap();
                        // self.app.emit("log", &event).unwrap();
                        // self.event_sender.blocking_send(event).unwrap();
                    }
                    "write" => {
                        let event = ReqwestEvent::Write(ReqwestEventWrite {
                            timestamp: Local::now().format("%H:%M:%S%.3f").to_string(),
                            id: request_id.as_str().to_string(),
                            data: String::from(data.as_str())
                                .replace("\\r\\n", "\r\n")
                                .replace("\\n", "\n"),
                        });
                        self.event_sender.try_send(event).unwrap();
                        // self.app.emit("log", &event).unwrap();
                        // self.event_sender.blocking_send(event).unwrap();
                    }
                    _ => {}
                }
            }
        }
    }

    fn flush(&self) {}
}
