use std::collections::HashMap;

use apicize_lib::DataSourceType;
use serde::{Deserialize, Serialize};

use crate::workspaces::EntityType;

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DataSetUpdate {
    pub id: String,
    pub entity_type: EntityType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_type: Option<DataSourceType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub csv_columns: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub csv_rows: Option<Vec<HashMap<String, String>>>,
}
