use apicize_lib::certificate::CertificatePlain;
use serde::{Deserialize, Serialize};
use serde_with::base64::{Base64, Standard};
use serde_with::formats::Unpadded;
use serde_with::serde_as;

use crate::workspaces::EntityType;

#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub enum CertificateUpdateType {
    PKCS12,
    PKCS8PEM,
    PEM,
}

#[serde_as]
#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CertificateUpdate {
    pub id: String,
    pub entity_type: EntityType,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub cert_type: Option<CertificateUpdateType>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde_as(as = "Option<Base64<Standard, Unpadded>>")]
    pub pfx: Option<Vec<u8>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<Option<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde_as(as = "Option<Base64<Standard, Unpadded>>")]
    pub pem: Option<Vec<u8>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde_as(as = "Option<Base64<Standard, Unpadded>>")]
    pub key: Option<Vec<u8>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_warnings: Option<Vec<String>>,
}

impl From<CertificatePlain> for CertificateUpdate {
    fn from(value: CertificatePlain) -> Self {
        match value {
            CertificatePlain::PKCS12 {
                id,
                name,
                pfx,
                password,
                validation_warnings,
                ..
            } => CertificateUpdate {
                id,
                entity_type: EntityType::Certificate,
                encrypted: Some(false),
                cert_type: Some(CertificateUpdateType::PKCS12),
                name: Some(name),
                pfx: Some(pfx),
                password: Some(password),
                pem: None,
                key: None,
                validation_warnings: Some(validation_warnings.unwrap_or_default()),
            },
            CertificatePlain::PKCS8PEM {
                id,
                name,
                pem,
                key,
                validation_warnings,
                ..
            } => CertificateUpdate {
                id,
                entity_type: EntityType::Certificate,
                encrypted: Some(false),
                cert_type: Some(CertificateUpdateType::PKCS8PEM),
                name: Some(name),
                pfx: None,
                password: None,
                pem: Some(pem),
                key: Some(key),
                validation_warnings: Some(validation_warnings.unwrap_or_default()),
            },
            CertificatePlain::PEM {
                id,
                name,
                pem,
                validation_warnings,
                ..
            } => CertificateUpdate {
                id,
                entity_type: EntityType::Certificate,
                encrypted: Some(false),
                cert_type: Some(CertificateUpdateType::PEM),
                name: Some(name),
                pfx: None,
                password: None,
                pem: Some(pem),
                key: None,
                validation_warnings: Some(validation_warnings.unwrap_or_default()),
            },
        }
    }
}
