use std::io;

use apicize_lib::{ApicizeError, FileAccessError};
use thiserror::Error;

use crate::workspaces::EntityType;

#[derive(Error, Debug)]
pub enum ApicizeAppError {
    #[error(transparent)]
    ApicizeError(#[from] ApicizeError),

    #[error(transparent)]
    IOError(#[from] io::Error),

    #[error("file access error")]
    FileAccessError(#[from] FileAccessError),

    #[error("serialization error")]
    SerializationError(#[from] serde_json::Error),

    #[error("invalid session '{0}'")]
    InvaliedSession(String),

    #[error("invalid workspace '{0}'")]
    InvalidWorkspace(String),

    #[error("invalid request '{0}'")]
    InvalidRequest(String),

    #[error("invalid group '{0}'")]
    InvalidGroup(String),

    #[error("invalid scenario '{0}'")]
    InvalidScenario(String),

    #[error("invalid authorization '{0}'")]
    InvalidAuthorization(String),

    #[error("invalid certificate '{0}'")]
    InvalidCertificate(String),

    #[error("invalid proxy '{0}'")]
    InvalidProxy(String),

    #[error("invalid external data '{0}'")]
    InvalidExternalData(String),

    #[error("invalid operation type '{0}'")]
    InvalidTypeForOperation(EntityType),

    #[error("invalid request '{0}' index {1}")]
    InvalidResult(String, usize),

    #[error("file name required")]
    FileNameRequired(),

    #[error("invalid operation {0}")]
    InvalidOperation(String),

    #[error("Unspecified error")]
    UnspecifiedError,

    #[error("No results returned")]
    NoResults,

    #[error("ConcurrencyE rror '{0}'")]
    ConcurrencyError(String),
}

impl serde::Serialize for ApicizeAppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
