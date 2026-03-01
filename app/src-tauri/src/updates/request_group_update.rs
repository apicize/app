use apicize_lib::{ExecutionConcurrency, RequestGroup, Selection};
use serde::{Deserialize, Serialize};

use crate::workspaces::EntityType;

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequestGroupUpdate {
    pub id: String,
    pub entity_type: EntityType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runs: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multi_run_execution: Option<ExecutionConcurrency>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub setup: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution: Option<ExecutionConcurrency>,
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

impl RequestGroupUpdate {
    pub fn from_selections(group: &RequestGroup) -> Self {
        RequestGroupUpdate {
            id: group.id.to_string(),
            entity_type: EntityType::Group,
            name: None,
            disabled: None,
            key: None,
            runs: None,
            multi_run_execution: None,
            execution: None,
            setup: None,
            selected_scenario: Some(group.selected_scenario.clone()),
            selected_authorization: Some(group.selected_authorization.clone()),
            selected_certificate: Some(group.selected_certificate.clone()),
            selected_proxy: Some(group.selected_proxy.clone()),
            selected_data: Some(group.selected_data.clone()),
            validation_warnings: None,
        }
    }
}
