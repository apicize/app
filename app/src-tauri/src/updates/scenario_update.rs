use apicize_lib::{ScenarioPlain, Variable};
use serde::{Deserialize, Serialize};

use crate::workspaces::EntityType;

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioUpdate {
    pub id: String,
    pub entity_type: EntityType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variables: Option<Vec<Variable>>,
}

impl From<ScenarioPlain> for ScenarioUpdate {
    fn from(value: ScenarioPlain) -> Self {
        ScenarioUpdate {
            id: value.id,
            entity_type: EntityType::Scenario,
            encrypted: Some(false),
            name: Some(value.name),
            variables: Some(value.variables.unwrap_or_default()),
        }
    }
}
