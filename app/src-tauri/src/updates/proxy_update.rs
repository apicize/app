use apicize_lib::proxy::ProxyPlain;
use serde::{Deserialize, Serialize};

use crate::workspaces::EntityType;

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProxyUpdate {
    pub id: String,
    pub entity_type: EntityType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl From<ProxyPlain> for ProxyUpdate {
    fn from(value: ProxyPlain) -> Self {
        ProxyUpdate {
            id: value.id,
            entity_type: EntityType::Proxy,
            encrypted: Some(false),
            name: Some(value.name),
            url: Some(value.url),
        }
    }
}
