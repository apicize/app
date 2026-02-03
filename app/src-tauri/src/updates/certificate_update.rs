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
}
