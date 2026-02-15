use apicize_lib::{
    Executable, ExecutionState, Identifiable, IndexedEntities, RequestEntry, Selection, Validated,
    ValidationState, Workspace, indexed_entities::NO_SELECTION_ID,
};
use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::workspaces::{EntityType, RequestExecution};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NavigationRequestEntry {
    pub id: String,
    pub name: String,
    pub children: Option<Vec<NavigationRequestEntry>>,
    pub validation_state: ValidationState,
    pub execution_state: ExecutionState,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NavigationEntry {
    pub id: String,
    pub name: String,
    pub validation_state: ValidationState,
    pub execution_state: ExecutionState,
}

impl Executable for NavigationEntry {
    fn get_execution_state(&self) -> &ExecutionState {
        &self.execution_state
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ParamNavigationSection {
    pub public: Vec<NavigationEntry>,
    pub private: Vec<NavigationEntry>,
    pub vault: Vec<NavigationEntry>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatedNavigationEntry {
    pub id: String,
    pub name: String,
    pub entity_type: EntityType,
    pub validation_state: ValidationState,
    pub execution_state: ExecutionState,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResponse {
    /// Warnings for invalid values
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub validation_warnings: Option<Vec<String>>,
    /// Validation errors
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub validation_errors: Option<HashMap<String, String>>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWithNavigationResponse {
    /// Updated navigation inforrmation
    pub navigation: Option<UpdatedNavigationEntry>,
    /// Warnings for invalid values
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub validation_warnings: Option<Vec<String>>,
    /// Validation errors
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub validation_errors: Option<HashMap<String, String>>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Navigation {
    pub requests: Vec<NavigationRequestEntry>,
    pub scenarios: ParamNavigationSection,
    pub authorizations: ParamNavigationSection,
    pub certificates: ParamNavigationSection,
    pub proxies: ParamNavigationSection,
    pub data_sets: Vec<NavigationEntry>,
    pub defaults: NavigationEntry,
}

impl ParamNavigationSection {
    pub fn new<T: Identifiable + Validated>(
        parameters: &IndexedEntities<T>,
    ) -> ParamNavigationSection {
        ParamNavigationSection {
            public: Self::map_entities(
                &parameters.entities,
                parameters.child_ids.get("W").map_or(&[], |e| e),
            ),
            private: Self::map_entities(
                &parameters.entities,
                parameters.child_ids.get("P").map_or(&[], |e| e),
            ),
            vault: Self::map_entities(
                &parameters.entities,
                parameters.child_ids.get("V").map_or(&[], |e| e),
            ),
        }
    }

    pub fn map_entities<T: Identifiable + Validated>(
        entities: &std::collections::HashMap<String, T>,
        ids: &[String],
    ) -> Vec<NavigationEntry> {
        ids.iter()
            .map(|id| {
                let entity = &entities.get(id).unwrap();
                NavigationEntry {
                    id: id.clone(),
                    name: entity.get_title(),
                    validation_state: entity.get_validation_state(),
                    execution_state: ExecutionState::empty(),
                }
            })
            .collect()
    }

    pub fn generate_selection_list(&self, include_off: bool) -> Vec<Selection> {
        let mut results: Vec<Selection> = if include_off {
            vec![Selection {
                id: NO_SELECTION_ID.to_string(),
                name: "Off".to_string(),
            }]
        } else {
            vec![]
        };
        let create_selection = |entry: &NavigationEntry| Selection {
            id: entry.id.clone(),
            name: entry.name.clone(),
        };
        results.extend(self.public.iter().map(create_selection));
        results.extend(self.private.iter().map(create_selection));
        results.extend(self.vault.iter().map(create_selection));
        results
    }
}

impl NavigationRequestEntry {
    /// Iteratively build navigation tree with pre-allocated capacity
    fn from_requests(
        ids: &[String],
        requests: &IndexedEntities<RequestEntry>,
        executions: &FxHashMap<String, RequestExecution>,
    ) -> Option<Vec<NavigationRequestEntry>> {
        if ids.is_empty() {
            return None;
        }

        // Pre-allocate result vector with exact capacity
        let mut results = Vec::with_capacity(ids.len());

        // Process each top-level ID
        for id in ids {
            if let Some(entity) = requests.entities.get(id) {
                let children = match entity {
                    RequestEntry::Request(_) => None,
                    RequestEntry::Group(_) => {
                        // For groups, build children iteratively
                        match requests.child_ids.get(id) {
                            Some(child_ids) if !child_ids.is_empty() => {
                                Self::build_children_iteratively(child_ids, requests, executions)
                            }
                            _ => Some(Vec::new()), // Empty group
                        }
                    }
                };

                let execution_state = if let Some(execution) = executions.get(id) {
                    execution.execution_state
                } else {
                    ExecutionState::empty()
                };

                results.push(NavigationRequestEntry {
                    id: id.clone(),
                    name: entity.get_title(),
                    children,
                    validation_state: entity.get_validation_state(),
                    execution_state,
                });
            }
        }

        if results.is_empty() {
            None
        } else {
            Some(results)
        }
    }

    /// Build children iteratively with pre-allocated capacity
    fn build_children_iteratively(
        child_ids: &[String],
        requests: &IndexedEntities<RequestEntry>,
        executions: &FxHashMap<String, RequestExecution>,
    ) -> Option<Vec<NavigationRequestEntry>> {
        if child_ids.is_empty() {
            return Some(Vec::new());
        }

        let mut results = Vec::with_capacity(child_ids.len());

        for child_id in child_ids {
            if let Some(entity) = requests.entities.get(child_id) {
                let validation_state = entity.get_validation_state();

                let children = match entity {
                    RequestEntry::Request(_) => None,
                    RequestEntry::Group(_) => {
                        match requests.child_ids.get(child_id) {
                            Some(grandchild_ids) if !grandchild_ids.is_empty() => {
                                // Recursive call but much more controlled - only for group structure
                                Self::build_children_iteratively(
                                    grandchild_ids,
                                    requests,
                                    executions,
                                )
                            }
                            _ => Some(Vec::new()), // Empty group
                        }
                    }
                };

                let execution_state = if let Some(execution) = executions.get(child_id) {
                    execution.execution_state
                } else {
                    ExecutionState::empty()
                };

                results.push(NavigationRequestEntry {
                    id: child_id.clone(),
                    name: entity.get_title(),
                    children,
                    validation_state,
                    execution_state,
                });
            }
        }

        Some(results)
    }

    pub fn build(
        requests: &IndexedEntities<RequestEntry>,
        executions: &FxHashMap<String, RequestExecution>,
    ) -> Vec<NavigationRequestEntry> {
        Self::from_requests(&requests.top_level_ids, requests, executions).unwrap_or_default()
    }
}

impl Navigation {
    pub fn new(
        workspace: &Workspace,
        executions: &FxHashMap<String, RequestExecution>,
    ) -> Navigation {
        Navigation {
            requests: NavigationRequestEntry::build(&workspace.requests, executions),
            scenarios: ParamNavigationSection::new(&workspace.scenarios),
            authorizations: ParamNavigationSection::new(&workspace.authorizations),
            certificates: ParamNavigationSection::new(&workspace.certificates),
            proxies: ParamNavigationSection::new(&workspace.proxies),
            data_sets: ParamNavigationSection::map_entities(
                &workspace.data.entities,
                &workspace.data.top_level_ids,
            ),
            defaults: NavigationEntry {
                id: "defaults".to_string(),
                name: "Defaults".to_string(),
                validation_state: workspace.defaults.validation_state,
                execution_state: ExecutionState::empty(),
            },
        }
    }

    fn delete_navigation_request(entity_id: &str, entries: &mut Vec<NavigationRequestEntry>) {
        if let Some(idx) = entries.iter().position(|entry| entry.id == entity_id) {
            entries.remove(idx);
        } else {
            for entry in entries {
                if let Some(children) = &mut entry.children {
                    Self::delete_navigation_request(entity_id, children);
                }
            }
        }
    }

    pub fn delete_navigation_entity(&mut self, entity_id: &str, entity_type: EntityType) {
        let delete_parameter = |entity_id: &str, entries: &mut ParamNavigationSection| {
            if let Some(idx) = entries
                .public
                .iter()
                .position(|entry| entry.id == entity_id)
            {
                entries.public.remove(idx);
            } else if let Some(idx) = entries
                .private
                .iter()
                .position(|entry| entry.id == entity_id)
            {
                entries.private.remove(idx);
            } else if let Some(idx) = entries.vault.iter().position(|entry| entry.id == entity_id) {
                entries.vault.remove(idx);
            }
        };

        match entity_type {
            EntityType::RequestEntry => Self::delete_navigation_request(entity_id, &mut self.requests),
            EntityType::Request => Self::delete_navigation_request(entity_id, &mut self.requests),
            EntityType::Group => Self::delete_navigation_request(entity_id, &mut self.requests),
            EntityType::Scenario => delete_parameter(entity_id, &mut self.scenarios),
            EntityType::Authorization => delete_parameter(entity_id, &mut self.authorizations),
            EntityType::Certificate => delete_parameter(entity_id, &mut self.certificates),
            EntityType::Proxy => delete_parameter(entity_id, &mut self.proxies),
            EntityType::DataSet => {
                if let Some(idx) = self
                    .data_sets
                    .iter()
                    .position(|entity| entity.id == entity_id)
                {
                    self.data_sets.remove(idx);
                }
            }
            _ => {}
        }
    }

    fn update_navigation_request(
        update: &UpdatedNavigationEntry,
        entries: &mut Vec<NavigationRequestEntry>,
    ) {
        if let Some(entry) = entries.iter_mut().find(|entry| entry.id == update.id) {
            entry.name = update.name.to_string();
            entry.validation_state = update.validation_state;
            entry.execution_state = update.execution_state;
        } else {
            for entry in entries {
                if let Some(children) = &mut entry.children {
                    Self::update_navigation_request(update, children);
                }
            }
        }
    }

    pub fn update_navigation_entity(&mut self, update: &UpdatedNavigationEntry) {
        let update_parameter = |entries: &mut ParamNavigationSection| {
            if let Some(entry) = entries
                .public
                .iter_mut()
                .chain(entries.private.iter_mut())
                .chain(entries.vault.iter_mut())
                .find(|entry| entry.id == update.id)
            {
                entry.name = update.name.to_string();
                entry.validation_state = update.validation_state;
                entry.execution_state = update.execution_state;
            }
        };

        match update.entity_type {
            EntityType::RequestEntry => Self::update_navigation_request(update, &mut self.requests),
            EntityType::Request => Self::update_navigation_request(update, &mut self.requests),
            EntityType::Group => Self::update_navigation_request(update, &mut self.requests),
            EntityType::Scenario => update_parameter(&mut self.scenarios),
            EntityType::Authorization => update_parameter(&mut self.authorizations),
            EntityType::Certificate => update_parameter(&mut self.certificates),
            EntityType::Proxy => update_parameter(&mut self.proxies),
            EntityType::DataSet => {
                if let Some(entry) = self
                    .data_sets
                    .iter_mut()
                    .find(|entity| entity.id == update.id)
                {
                    entry.name = update.name.to_string();
                    entry.validation_state = update.validation_state;
                    entry.execution_state = update.execution_state;
                }
            }
            _ => {}
        };
    }
}
