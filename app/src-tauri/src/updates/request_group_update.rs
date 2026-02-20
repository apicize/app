use apicize_lib::{ExecutionConcurrency, RequestGroup, Selection};
use serde::{Deserialize, Serialize};

use crate::workspaces::{DEFAULT_SELECTION_ID, EntityType};

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
            selected_scenario: if let Some(selection) = &group.selected_scenario {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_authorization: if let Some(selection) = &group.selected_authorization {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_certificate: if let Some(selection) = &group.selected_certificate {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_proxy: if let Some(selection) = &group.selected_proxy {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_data: if let Some(selection) = &group.selected_data {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            validation_warnings: None,
        }
    }
}
