use apicize_lib::Selection;
use serde::{Deserialize, Serialize};

use crate::workspaces::EntityType;

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DefaultsUpdate {
    pub entity_type: EntityType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_scenario: Option<Selection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_authorization: Option<Selection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_certificate: Option<Selection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_proxy: Option<Selection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_data: Option<Selection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_warnings: Option<Vec<String>>,
}
