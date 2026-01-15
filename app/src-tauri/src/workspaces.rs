use apicize_lib::{
    Authorization, Certificate, Executable, ExecutionReportFormat, ExecutionResultSuccess,
    ExecutionResultSummary, ExecutionState, ExternalData, Identifiable, IndexedEntities, Proxy,
    Request, RequestBody, RequestEntry, RequestGroup, Scenario, SelectedParameters, Selection,
    Validated, ValidationState, WorkbookDefaultParameters, Workspace,
    editing::indexed_entities::IndexedEntityPosition, identifiable::CloneIdentifiable,
    indexed_entities::NO_SELECTION_ID,
};
use file_type::FileType;
use indexmap::IndexMap;
use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use serde_json::ser::PrettyFormatter;
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::{
    collections::{HashMap, HashSet, VecDeque},
    fmt::Display,
    path::PathBuf,
};
use uuid::Uuid;

use crate::{
    error::ApicizeAppError,
    results::{ExecutionResultBuilder, ExecutionResultDetail},
    sessions::{Session, SessionSaveState},
    settings::ApicizeSettings,
};

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
    pub validation_state: Option<ValidationState>,
    pub execution_state: Option<ExecutionState>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Navigation {
    pub requests: Vec<NavigationRequestEntry>,
    pub scenarios: ParamNavigationSection,
    pub authorizations: ParamNavigationSection,
    pub certificates: ParamNavigationSection,
    pub proxies: ParamNavigationSection,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", untagged)]
pub enum RequestEntryInfo {
    Request { request: Request },
    Group { group: RequestGroup },
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RequestBodyInfo {
    /// Request ID
    pub request_id: String,
    /// Mime type of the body
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_length: Option<usize>,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RequestBodyInfoWithBody {
    pub request_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<RequestBody>,
    /// Mime type of the body
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_length: Option<usize>,
}

pub struct WorkspaceInfo {
    /// True if workspace has been modified since last open/save
    pub dirty: bool,
    /// True if user should be warned on public credentials or certificates
    pub warn_on_workspace_creds: bool,
    /// File name to save worksapce to, empty if new
    pub file_name: String,
    /// Display name for workspace, empty if new
    pub display_name: String,
    /// Actual workspace
    pub workspace: Workspace,
    /// Activation tree
    pub navigation: Navigation,
    /// Execution results
    pub execution_results: ExecutionResultBuilder,
    /// Execution information
    pub executions: FxHashMap<String, RequestExecution>,
    /// Request body types
    pub request_body_mime_types: HashMap<String, String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSaveStatus {
    /// True if workspace has been modified since last open/save
    pub dirty: bool,
    /// True if user should be warned on public credentials or certificates
    pub warn_on_workspace_creds: bool,
    /// True if there are any invalid entities
    pub any_invalid: bool,
    /// File name
    pub file_name: String,
    /// Display name
    pub display_name: String,
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

    fn map_entities<T: Identifiable + Validated>(
        entities: &std::collections::HashMap<String, T>,
        ids: &[String],
    ) -> Vec<NavigationEntry> {
        ids.iter()
            .map(|id| {
                let entity = &entities.get(id).unwrap();
                NavigationEntry {
                    id: id.clone(),
                    name: entity.get_title(),
                    validation_state: entity.get_validation_state().clone(),
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
                    validation_state: entity.get_validation_state().clone(),
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
                    validation_state: validation_state.clone(),
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
        }
    }
}

#[derive(Default)]
pub struct Workspaces {
    pub workspaces: FxHashMap<String, WorkspaceInfo>,
}

impl Workspaces {
    pub fn trace_all_workspaces(&self) {
        println!("   Workspaces:");
        for (id, info) in &self.workspaces {
            println!(
                "      ID: {}, Name: {}, Path: {}",
                id, info.display_name, info.file_name
            );
        }
    }

    pub fn get_body_type(body: &RequestBody) -> String {
        match body {
            RequestBody::Text { .. } => "text/plain".to_string(),
            RequestBody::JSON { .. } => "application/json".to_string(),
            RequestBody::XML { .. } => "application/xml".to_string(),
            RequestBody::Form { .. } => "application/x-www-form-urlencoded".to_string(),
            RequestBody::Raw { data } => FileType::from_bytes(data)
                .media_types()
                .first()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string()),
        }
    }

    pub fn get_body_length(body: &RequestBody) -> usize {
        match body {
            RequestBody::Text { data } => data.len(),
            RequestBody::JSON { data } => data.len(),
            RequestBody::XML { data } => data.len(),
            RequestBody::Form { data } => data.len(),
            RequestBody::Raw { data } => data.len(),
        }
    }

    /// Add workspace, return workspace ID and display name
    pub fn add_workspace(
        &mut self,
        workspace: Workspace,
        file_name: &str,
        is_new: bool,
    ) -> OpenWorkspaceResult {
        let workspace_id = Uuid::new_v4().to_string();
        let navigation = Navigation::new(&workspace, &FxHashMap::default());

        let display_name = if file_name.is_empty() {
            String::default()
        } else {
            PathBuf::from(&file_name)
                .file_stem()
                .unwrap()
                .to_string_lossy()
                .to_string()
        };

        let any_public_auths = workspace
            .authorizations
            .child_ids
            .get("W")
            .is_some_and(|c| !c.is_empty());
        let any_public_certs = workspace
            .certificates
            .child_ids
            .get("W")
            .is_some_and(|c| !c.is_empty());

        self.workspaces.insert(
            workspace_id.clone(),
            WorkspaceInfo {
                dirty: false,
                warn_on_workspace_creds: !(any_public_auths || any_public_certs),
                workspace,
                navigation,
                execution_results: ExecutionResultBuilder::default(),
                executions: FxHashMap::default(),
                file_name: file_name.to_string(),
                display_name: display_name.clone(),
                request_body_mime_types: HashMap::default(),
            },
        );

        if is_new {
            let request = Request {
                name: "New Request".to_string(),
                ..Default::default()
            };

            let info = self.workspaces.get_mut(&workspace_id).unwrap();

            info.navigation.requests.push(NavigationRequestEntry {
                id: request.id.clone(),
                name: request.name.clone(),
                children: None,
                validation_state: ValidationState::empty(),
                execution_state: ExecutionState::empty(),
            });

            info.workspace
                .requests
                .add_entity(RequestEntry::Request(request), None, None)
                .unwrap();
        }

        OpenWorkspaceResult {
            workspace_id,
            display_name,
            error: None,
        }
    }

    pub fn remove_workspace(&mut self, workspace_id: &str) {
        // log::trace!("Removing workspace {}", &workspace_id);
        self.workspaces.remove(workspace_id);
    }

    pub fn find_workspace_by_filename(
        &self,
        file_name: &str,
        skip_workspace_id: Option<&String>,
    ) -> Vec<String> {
        self.workspaces
            .iter()
            .filter_map(|(id, w)| {
                if Some(id) == skip_workspace_id {
                    None
                } else {
                    match w.file_name == file_name {
                        true => Some(id.clone()),
                        false => None,
                    }
                }
            })
            .collect()
    }

    pub fn get_workspace_info(
        &self,
        workspace_id: &str,
    ) -> Result<&WorkspaceInfo, ApicizeAppError> {
        match self.workspaces.get(workspace_id) {
            Some(w) => Ok(w),
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_workspace_info_mut(
        &mut self,
        workspace_id: &str,
    ) -> Result<&mut WorkspaceInfo, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(w) => Ok(w),
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_workspace(&self, workspace_id: &str) -> Result<&Workspace, ApicizeAppError> {
        match self.workspaces.get(workspace_id) {
            Some(w) => Ok(&w.workspace),
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_navigation(&self, workspace_id: &str) -> Result<&Navigation, ApicizeAppError> {
        match self.workspaces.get(workspace_id) {
            Some(w) => Ok(&w.navigation),
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_dirty(&self, workspace_id: &str) -> Result<bool, ApicizeAppError> {
        match self.workspaces.get(workspace_id) {
            Some(info) => Ok(info.dirty),
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_workspace_mut(
        &mut self,
        workspace_id: &str,
    ) -> Result<&mut Workspace, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(w) => Ok(&mut w.workspace),
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_result_detail(
        &self,
        workspace_id: &str,
        exec_ctr: usize,
    ) -> Result<ExecutionResultDetail, ApicizeAppError> {
        self.get_workspace_info(workspace_id)?
            .execution_results
            .get_detail(&exec_ctr)
            .cloned()
            .map_err(ApicizeAppError::ApicizeError)
    }

    pub fn get_request_entry(
        &self,
        workspace_id: &str,
        request_id: &str,
    ) -> Result<RequestEntryInfo, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.requests.entities.get(request_id) {
            Some(entry) => match entry {
                RequestEntry::Request(request) => {
                    // Remove the headers and body, they will be returned separately
                    // to keep the request size smaller for everything else
                    let mut request = request.clone();
                    request.body = None;
                    Ok(RequestEntryInfo::Request { request })
                }
                RequestEntry::Group(group) => Ok(RequestEntryInfo::Group {
                    group: group.clone(),
                }),
            },
            None => Err(ApicizeAppError::InvalidRequest(request_id.into())),
        }
    }

    pub fn get_request_body(
        &mut self,
        workspace_id: &str,
        request_id: &str,
    ) -> Result<RequestBodyInfoWithBody, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        match info.workspace.requests.entities.get(request_id) {
            Some(RequestEntry::Request(request)) => {
                let (body_mime_type, body_length) = if let Some(body) = &request.body {
                    let body_type = Workspaces::get_body_type(body);
                    let body_length = Workspaces::get_body_length(body);
                    info.request_body_mime_types
                        .insert(request_id.to_string(), body_type.clone());
                    // println!("Request {} mime type: {}", request_id, &body_type);
                    (Some(body_type), Some(body_length))
                } else {
                    (None, None)
                };
                Ok(RequestBodyInfoWithBody {
                    request_id: request_id.to_string(),
                    body: request.body.clone(),
                    body_mime_type,
                    body_length,
                })
            }
            _ => Err(ApicizeAppError::InvalidRequest(request_id.into())),
        }
    }

    pub fn get_execution(
        &mut self,
        workspace_id: &str,
        request_or_group_id: &str,
    ) -> Result<RequestExecution, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        Ok(info.get_execution_mut(request_or_group_id).clone())
    }

    pub fn add_request(
        &mut self,
        workspace_id: &str,
        relative_to: Option<&str>,
        relative_position: Option<IndexedEntityPosition>,
        clone_from_id: Option<&str>,
    ) -> Result<String, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        let request = match clone_from_id {
            Some(other_id) => match info.workspace.requests.entities.get(other_id) {
                Some(RequestEntry::Request(request)) => {
                    request.clone_as_new(Self::create_copy_name(request.get_name()))
                }
                _ => return Err(ApicizeAppError::InvalidRequest(other_id.into())),
            },
            None => Request::default(),
        };
        let id = request.id.clone();
        info.workspace.requests.add_entity(
            RequestEntry::Request(request),
            relative_to,
            relative_position,
        )?;
        Ok(id)
    }

    pub fn add_request_group(
        &mut self,
        workspace_id: &str,
        relative_to: Option<&str>,
        relative_position: Option<IndexedEntityPosition>,
        clone_from_id: Option<&str>,
    ) -> Result<String, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;

        let group = match clone_from_id {
            Some(other_id) => match info.workspace.requests.entities.get(other_id) {
                Some(RequestEntry::Group(group)) => {
                    group.clone_as_new(Self::create_copy_name(group.get_name()))
                }
                _ => return Err(ApicizeAppError::InvalidGroup(other_id.into())),
            },
            None => RequestGroup::default(),
        };

        let id = group.id.clone();
        info.workspace.requests.add_entity(
            RequestEntry::Group(group),
            relative_to,
            relative_position,
        )?;

        if let Some(other_id) = clone_from_id {
            // Pre-calculate approximate size by counting descendant nodes
            let estimated_size = Self::count_descendant_nodes(&info.workspace.requests, other_id);

            // Pre-allocate collections with estimated capacity
            let mut cloned_group_ids = FxHashMap::<String, String>::with_capacity_and_hasher(
                estimated_size / 2,
                Default::default(),
            );
            cloned_group_ids.insert(other_id.to_string(), id.to_string());

            let mut new_entries = Vec::<RequestEntry>::with_capacity(estimated_size);
            let mut new_child_mappings = FxHashMap::<String, Vec<String>>::with_capacity_and_hasher(
                estimated_size / 2,
                Default::default(),
            );

            // Use a single pass to collect all entries that need cloning
            let mut to_process = VecDeque::with_capacity(estimated_size);
            to_process.push_back(other_id.to_string());

            let mut processed = HashSet::<String>::with_capacity(estimated_size);

            while let Some(parent_id) = to_process.pop_front() {
                if !processed.insert(parent_id.clone()) {
                    continue; // Already processed
                }

                if let Some(child_ids) = info.workspace.requests.child_ids.get(&parent_id) {
                    let new_group_id = cloned_group_ids
                        .get(&parent_id)
                        .expect("Parent group ID should exist in cloned_group_ids")
                        .clone();

                    // Pre-allocate child vector with known size
                    let mut new_group_child_ids = Vec::with_capacity(child_ids.len());

                    for child_id in child_ids {
                        if let Some(child) = info.workspace.requests.get(child_id) {
                            let cloned_child = child.clone_as_new(child.get_name().to_owned());
                            let cloned_child_id = cloned_child.get_id().to_string();
                            let is_group = matches!(&cloned_child, RequestEntry::Group(_));

                            new_group_child_ids.push(cloned_child_id.clone());
                            new_entries.push(cloned_child);

                            if is_group {
                                cloned_group_ids.insert(child_id.to_string(), cloned_child_id);
                                to_process.push_back(child_id.clone());
                            }
                        }
                    }

                    new_child_mappings.insert(new_group_id, new_group_child_ids);
                }
            }

            // Batch insert new entries - more efficient than individual inserts
            info.workspace.requests.entities.reserve(new_entries.len());
            for entry in new_entries {
                info.workspace
                    .requests
                    .entities
                    .insert(entry.get_id().to_string(), entry);
            }

            // Batch insert child mappings
            info.workspace
                .requests
                .child_ids
                .reserve(new_child_mappings.len());
            info.workspace.requests.child_ids.extend(new_child_mappings);
        }
        Ok(id)
    }

    pub fn delete_request_entry(
        &mut self,
        workspace_id: &str,
        request_or_group_id: &str,
    ) -> Result<(), ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        info.workspace.requests.remove_entity(request_or_group_id)?;
        info.executions.remove(request_or_group_id);
        info.request_body_mime_types.remove(request_or_group_id);
        info.workspace.validate_selections();
        Ok(())
    }

    pub fn move_request_entry(
        &mut self,
        workspace_id: &str,
        request_or_group_id: &str,
        relative_to: &str,
        relative_position: IndexedEntityPosition,
    ) -> Result<bool, ApicizeAppError> {
        let workspace = self.get_workspace_mut(workspace_id)?;
        Ok(workspace
            .requests
            .move_entity(request_or_group_id, relative_to, relative_position)?)
    }

    pub fn update_request(
        &mut self,
        workspace_id: &str,
        request: Request,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;

        let (name, validation_state) = match info.workspace.requests.entities.get_mut(&request.id) {
            Some(RequestEntry::Request(existing_request)) => {
                existing_request.name = request.name;
                existing_request.key = request.key;
                existing_request.test = request.test;
                existing_request.url = request.url;
                existing_request.method = request.method;
                existing_request.query_string_params = request.query_string_params;
                existing_request.timeout = request.timeout;
                existing_request.accept_invalid_certs = request.accept_invalid_certs;
                existing_request.keep_alive = request.keep_alive;
                existing_request.runs = request.runs;
                existing_request.multi_run_execution = request.multi_run_execution;
                existing_request.selected_scenario = request.selected_scenario;
                existing_request.selected_authorization = request.selected_authorization;
                existing_request.selected_certificate = request.selected_certificate;
                existing_request.selected_proxy = request.selected_proxy;
                existing_request.selected_data = request.selected_data;

                existing_request.set_validation_warnings(request.validation_warnings);
                existing_request.set_validation_errors(request.validation_errors);

                (
                    existing_request.get_name().to_string(),
                    existing_request.get_validation_state().clone(),
                )
            }
            _ => {
                return Err(ApicizeAppError::InvalidRequest(
                    format!("Mismatch request ID: {}", request.id).to_string(),
                ));
            }
        };

        info.check_request_navigation_update(&request.id, &name, Some(&validation_state), None)
    }

    pub fn update_group(
        &mut self,
        workspace_id: &str,
        group: RequestGroup,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(info) => {
                info.dirty = true;
                let id = &group.id;
                let result = info.check_request_navigation_update(
                    &group.id,
                    &group.get_title().to_string(),
                    Some(group.get_validation_state()),
                    None,
                );
                info.workspace
                    .requests
                    .entities
                    .insert(id.clone(), RequestEntry::Group(group));

                result
            }
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_request_title(
        &self,
        workspace_id: &str,
        request_id: &str,
    ) -> Result<String, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.requests.entities.get(request_id) {
            Some(entry) => Ok(entry.get_title()),
            None => Err(ApicizeAppError::InvalidRequest(request_id.into())),
        }
    }

    pub fn get_request_active_authorization(
        &self,
        workspace_id: &str,
        request_id: &str,
    ) -> Result<Option<Authorization>, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;

        let mut result: Option<Authorization> = None;
        let mut id_to_check = request_id.to_string();

        while let Some(entry) = workspace.requests.entities.get(&id_to_check) {
            if let Some(auth) = entry.selected_authorization() {
                if auth.id == NO_SELECTION_ID {
                    result = None;
                    break;
                } else {
                    match workspace.authorizations.get(&auth.id) {
                        Some(a) => {
                            result = Some(a.clone());
                        }
                        None => {
                            return Err(ApicizeAppError::InvalidAuthorization(auth.id.to_owned()));
                        }
                    }
                }
            }

            match Self::get_request_parent_id(entry.get_id(), workspace) {
                Some(parent_id) => {
                    id_to_check = parent_id.to_string();
                }
                None => {
                    break;
                }
            }
        }

        if result.is_none()
            && let Some(selection) = &workspace.defaults.selected_authorization
        {
            match workspace.authorizations.get(selection.id.as_str()) {
                Some(auth) => {
                    result = Some(auth.clone());
                }
                None => {
                    return Err(ApicizeAppError::InvalidAuthorization(
                        selection.id.to_owned(),
                    ));
                }
            }
        }

        Ok(result)
    }

    pub fn get_request_active_data(
        &self,
        workspace_id: &str,
        request_id: &str,
    ) -> Result<Option<ExternalData>, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;

        let mut result: Option<ExternalData> = None;
        let mut id_to_check = request_id.to_string();

        while let Some(entry) = workspace.requests.entities.get(&id_to_check) {
            if let Some(data) = entry.selected_data() {
                if data.id == NO_SELECTION_ID {
                    result = None;
                    break;
                } else {
                    match workspace.data.iter().find(|d| d.id == data.id) {
                        Some(ed) => {
                            result = Some(ed.clone());
                        }
                        None => {
                            return Err(ApicizeAppError::InvalidExternalData(data.id.to_owned()));
                        }
                    }
                }
            }

            match Self::get_request_parent_id(entry.get_id(), workspace) {
                Some(parent_id) => {
                    id_to_check = parent_id.to_string();
                }
                None => {
                    break;
                }
            }
        }

        if result.is_none()
            && let Some(selection) = &workspace.defaults.selected_data
        {
            match workspace.data.iter().find(|d| d.id == selection.id) {
                Some(ed) => {
                    result = Some(ed.clone());
                }
                None => {
                    return Err(ApicizeAppError::InvalidExternalData(
                        selection.id.to_owned(),
                    ));
                }
            }
        }

        Ok(result)
    }

    /// Update request body and return reference to request info so it can be resent
    pub fn update_request_body(
        &mut self,
        workspace_id: &str,
        body_info: &RequestBodyInfoWithBody,
    ) -> Result<(), ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(info) => {
                info.dirty = true;
                let id = &body_info.request_id;
                if let Some(RequestEntry::Request(existing_request)) =
                    info.workspace.requests.entities.get_mut(id)
                {
                    match &body_info.body {
                        Some(body) => {
                            let mime_type = Workspaces::get_body_type(body);
                            info.request_body_mime_types.insert(id.clone(), mime_type);
                            existing_request.body = Some(body.clone());
                        }
                        None => {
                            info.request_body_mime_types.remove(id);
                            existing_request.body = None;
                        }
                    }
                    Ok(())
                } else {
                    Err(ApicizeAppError::InvalidRequest(
                        body_info.request_id.clone(),
                    ))
                }
            }
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    /// Locate specified ID and return its type, if it exists
    pub fn get_entity_type(
        &self,
        workspace_id: &str,
        entity_id: &str,
    ) -> Result<Option<EntityType>, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        if workspace.requests.entities.contains_key(entity_id) {
            Ok(Some(EntityType::RequestEntry))
        } else if workspace.scenarios.entities.contains_key(entity_id) {
            Ok(Some(EntityType::Scenario))
        } else if workspace.authorizations.entities.contains_key(entity_id) {
            Ok(Some(EntityType::Authorization))
        } else if workspace.certificates.entities.contains_key(entity_id) {
            Ok(Some(EntityType::Certificate))
        } else if workspace.proxies.entities.contains_key(entity_id) {
            Ok(Some(EntityType::Proxy))
        } else {
            Ok(None)
        }
    }

    /// Return a list of any IDs that are parents to the specified ID
    pub fn find_parent_ids(
        &self,
        workspace_id: &str,
        entity_type: EntityType,
        entity_id: &str,
    ) -> Result<Vec<String>, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;

        let child_id_assigments = match entity_type {
            EntityType::RequestEntry => &workspace.requests.child_ids,
            EntityType::Request => &workspace.requests.child_ids,
            EntityType::Group => &workspace.requests.child_ids,
            EntityType::Scenario => &workspace.scenarios.child_ids,
            EntityType::Authorization => &workspace.authorizations.child_ids,
            EntityType::Certificate => &workspace.certificates.child_ids,
            EntityType::Proxy => &workspace.proxies.child_ids,
            _ => {
                return Err(ApicizeAppError::InvalidOperation(format!(
                    "Invalid list type {entity_type}",
                )));
            }
        };

        let mut results = vec![];
        let mut check_id: Option<&str> = Some(entity_id);

        while let Some(id) = check_id {
            if let Some(assignment) = child_id_assigments
                .iter()
                .find(|(_, child_ids)| child_ids.iter().any(|child_id| *child_id == id))
            {
                results.push(assignment.0.to_string());
                check_id = Some(assignment.0);
            } else {
                check_id = None;
            }
        }

        Ok(results)
    }

    /// Return a list of all group and descendant group IDs
    pub fn find_descendent_groups(
        &self,
        workspace_id: &str,
        group_id: &str,
    ) -> Result<Vec<String>, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        let mut results = Vec::<String>::new();

        let mut to_process = vec![group_id.to_string()];
        let mut processed = HashSet::<String>::new();

        while let Some(id) = to_process.pop() {
            if processed.contains(&id) {
                continue;
            }
            if let Some(child_ids) = workspace.requests.child_ids.get(&id) {
                results.push(id.clone());
                to_process.extend(child_ids.to_vec());
            }
            processed.insert(id);
        }

        Ok(results)
    }

    pub fn get_scenario(
        &self,
        workspace_id: &str,
        scenario_id: &str,
    ) -> Result<&Scenario, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.scenarios.entities.get(scenario_id) {
            Some(s) => Ok(s),
            None => Err(ApicizeAppError::InvalidScenario(scenario_id.into())),
        }
    }

    pub fn get_scenario_title(
        &self,
        workspace_id: &str,
        scenario_id: &str,
    ) -> Result<String, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.scenarios.entities.get(scenario_id) {
            Some(entry) => Ok(entry.get_title()),
            None => Err(ApicizeAppError::InvalidRequest(scenario_id.into())),
        }
    }

    pub fn add_scenario(
        &mut self,
        workspace_id: &str,
        relative_to: Option<&str>,
        relative_position: Option<IndexedEntityPosition>,
        clone_from_id: Option<&str>,
    ) -> Result<String, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        let scenario = match clone_from_id {
            Some(other_id) => match info.workspace.scenarios.get(other_id) {
                Some(other) => other.clone_as_new(Self::create_copy_name(&other.name)),
                None => return Err(ApicizeAppError::InvalidScenario(other_id.to_owned())),
            },
            None => Scenario::default(),
        };
        let id = scenario.id.clone();
        info.workspace
            .scenarios
            .add_entity(scenario, relative_to, relative_position)?;
        Ok(id)
    }

    pub fn delete_scenario(
        &mut self,
        workspace_id: &str,
        scenario_id: &str,
    ) -> Result<(), ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        info.workspace.scenarios.remove_entity(scenario_id)?;
        info.workspace.validate_selections();
        Ok(())
    }

    pub fn move_scenario(
        &mut self,
        workspace_id: &str,
        scenario_id: &str,
        relative_to: &str,
        relative_position: IndexedEntityPosition,
    ) -> Result<bool, ApicizeAppError> {
        let workspace = self.get_workspace_mut(workspace_id)?;
        Ok(workspace
            .scenarios
            .move_entity(scenario_id, relative_to, relative_position)?)
    }

    pub fn update_scenario(
        &mut self,
        workspace_id: &str,
        scenario: Scenario,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(info) => {
                info.dirty = true;
                let id = scenario.get_id();
                let result =
                    info.check_parameter_navigation_update(&scenario, EntityType::Scenario);

                for request_entry in info.workspace.requests.entities.values_mut() {
                    if let Some(s) = request_entry.selected_scenario_as_mut()
                        && s.id == id
                    {
                        s.name = scenario.name.clone();
                    }
                }

                if let Some(s) = info.workspace.defaults.selected_scenario_as_mut()
                    && s.id == id
                {
                    s.name = scenario.name.clone();
                }

                info.workspace
                    .scenarios
                    .entities
                    .insert(id.to_string(), scenario);

                Ok(result)
            }
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_authorization(
        &self,
        workspace_id: &str,
        authorization_id: &str,
    ) -> Result<Authorization, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.authorizations.entities.get(authorization_id) {
            Some(a) => Ok(a.clone()),
            None => Err(ApicizeAppError::InvalidAuthorization(
                authorization_id.into(),
            )),
        }
    }

    pub fn get_authorization_title(
        &self,
        workspace_id: &str,
        authorization_id: &str,
    ) -> Result<String, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.authorizations.entities.get(authorization_id) {
            Some(entry) => Ok(entry.get_title()),
            None => Err(ApicizeAppError::InvalidRequest(authorization_id.into())),
        }
    }

    pub fn add_authorization(
        &mut self,
        workspace_id: &str,
        relative_to: Option<&str>,
        relative_position: Option<IndexedEntityPosition>,
        clone_from_id: Option<&str>,
    ) -> Result<String, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        let authorization = match clone_from_id {
            Some(other_id) => match info.workspace.authorizations.get(other_id) {
                Some(other) => other.clone_as_new(Self::create_copy_name(other.get_name())),
                None => return Err(ApicizeAppError::InvalidAuthorization(other_id.to_owned())),
            },
            None => Authorization::default(),
        };
        let id = authorization.get_id().to_string();
        info.workspace
            .authorizations
            .add_entity(authorization, relative_to, relative_position)?;
        Ok(id)
    }

    pub fn delete_authorization(
        &mut self,
        workspace_id: &str,
        authorization_id: &str,
    ) -> Result<(), ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        info.workspace
            .authorizations
            .remove_entity(authorization_id)?;

        Ok(())
    }

    pub fn move_authorization(
        &mut self,
        workspace_id: &str,
        authorization_id: &str,
        relative_to: &str,
        relative_position: IndexedEntityPosition,
    ) -> Result<bool, ApicizeAppError> {
        let workspace = self.get_workspace_mut(workspace_id)?;
        Ok(workspace.authorizations.move_entity(
            authorization_id,
            relative_to,
            relative_position,
        )?)
    }

    pub fn update_authorization(
        &mut self,
        workspace_id: &str,
        authorization: Authorization,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(info) => {
                info.dirty = true;
                let id = authorization.get_id();
                let result = info
                    .check_parameter_navigation_update(&authorization, EntityType::Authorization);

                for request_entry in info.workspace.requests.entities.values_mut() {
                    if let Some(s) = request_entry.selected_authorization_as_mut()
                        && s.id == id
                    {
                        s.name = authorization.get_name().to_string();
                    }
                }

                if let Some(s) = info.workspace.defaults.selected_authorization_as_mut()
                    && s.id == id
                {
                    s.name = authorization.get_name().to_string();
                }

                info.workspace
                    .authorizations
                    .entities
                    .insert(id.to_string(), authorization);

                Ok(result)
            }
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    /// List authorizations that are stored in the public or private workbook files
    pub fn list_workbook_authorization_ids(
        &mut self,
        workspace_id: &str,
    ) -> Result<Vec<String>, ApicizeAppError> {
        let info = self.get_workspace_info(workspace_id)?;
        let ids = info
            .navigation
            .authorizations
            .public
            .iter()
            .map(|auth| auth.id.clone())
            .chain(
                info.navigation
                    .authorizations
                    .private
                    .iter()
                    .map(|auth| auth.id.clone()),
            )
            .collect::<Vec<String>>();
        Ok(ids)
    }

    pub fn get_certificate(
        &self,
        workspace_id: &str,
        certificate_id: &str,
    ) -> Result<Certificate, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.certificates.entities.get(certificate_id) {
            Some(c) => Ok(c.clone()),
            None => Err(ApicizeAppError::InvalidCertificate(certificate_id.into())),
        }
    }

    pub fn get_certificate_title(
        &self,
        workspace_id: &str,
        certificate_id: &str,
    ) -> Result<String, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.certificates.entities.get(certificate_id) {
            Some(entry) => Ok(entry.get_title()),
            None => Err(ApicizeAppError::InvalidRequest(certificate_id.into())),
        }
    }

    pub fn add_certificate(
        &mut self,
        workspace_id: &str,
        relative_to: Option<&str>,
        relative_position: Option<IndexedEntityPosition>,
        clone_from_id: Option<&str>,
    ) -> Result<String, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        let certificate = match clone_from_id {
            Some(other_id) => match info.workspace.certificates.get(other_id) {
                Some(other) => other.clone_as_new(Self::create_copy_name(other.get_name())),
                None => return Err(ApicizeAppError::InvalidCertificate(other_id.to_owned())),
            },
            None => Certificate::default(),
        };
        let id = certificate.get_id().to_string();
        info.workspace
            .certificates
            .add_entity(certificate, relative_to, relative_position)?;
        Ok(id)
    }

    pub fn delete_certificate(
        &mut self,
        workspace_id: &str,
        certificate_id: &str,
    ) -> Result<(), ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        info.workspace.certificates.remove_entity(certificate_id)?;
        info.workspace.validate_selections();
        Ok(())
    }

    pub fn move_certificate(
        &mut self,
        workspace_id: &str,
        certificate_id: &str,
        relative_to: &str,
        relative_position: IndexedEntityPosition,
    ) -> Result<bool, ApicizeAppError> {
        let workspace = self.get_workspace_mut(workspace_id)?;
        Ok(workspace
            .certificates
            .move_entity(certificate_id, relative_to, relative_position)?)
    }

    pub fn update_certificate(
        &mut self,
        workspace_id: &str,
        certificate: Certificate,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(info) => {
                info.dirty = true;
                let id = certificate.get_id();
                let result =
                    info.check_parameter_navigation_update(&certificate, EntityType::Certificate);

                for request_entry in info.workspace.requests.entities.values_mut() {
                    if let Some(s) = request_entry.selected_certificate_as_mut()
                        && s.id == id
                    {
                        s.name = certificate.get_name().to_string();
                    }
                }

                for auth in info.workspace.authorizations.entities.values_mut() {
                    if let Authorization::OAuth2Client {
                        selected_certificate: Some(s),
                        ..
                    } = auth
                        && s.id == id
                    {
                        s.name = certificate.get_name().to_string();
                    }
                }

                if let Some(s) = info.workspace.defaults.selected_certificate_as_mut()
                    && s.id == id
                {
                    s.name = certificate.get_name().to_string();
                }

                info.workspace
                    .certificates
                    .entities
                    .insert(id.to_string(), certificate);
                Ok(result)
            }
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn get_proxy(&self, workspace_id: &str, proxy_id: &str) -> Result<&Proxy, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.proxies.entities.get(proxy_id) {
            Some(p) => Ok(p),
            None => Err(ApicizeAppError::InvalidCertificate(proxy_id.into())),
        }
    }

    pub fn get_proxy_title(
        &self,
        workspace_id: &str,
        proxy_id: &str,
    ) -> Result<String, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.proxies.entities.get(proxy_id) {
            Some(entry) => Ok(entry.get_title()),
            None => Err(ApicizeAppError::InvalidRequest(proxy_id.into())),
        }
    }

    pub fn add_proxy(
        &mut self,
        workspace_id: &str,
        relative_to: Option<&str>,
        relative_position: Option<IndexedEntityPosition>,
        clone_from_id: Option<&str>,
    ) -> Result<String, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        let proxy = match clone_from_id {
            Some(other_id) => match info.workspace.proxies.get(other_id) {
                Some(other) => other.clone_as_new(Self::create_copy_name(&other.name)),
                None => return Err(ApicizeAppError::InvalidProxy(other_id.to_owned())),
            },
            None => Proxy::default(),
        };
        let id = proxy.id.clone();
        info.workspace
            .proxies
            .add_entity(proxy, relative_to, relative_position)?;
        Ok(id)
    }

    pub fn delete_proxy(
        &mut self,
        workspace_id: &str,
        proxy_id: &str,
    ) -> Result<(), ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        info.workspace.proxies.remove_entity(proxy_id)?;
        info.workspace.validate_selections();
        Ok(())
    }

    pub fn move_proxy(
        &mut self,
        workspace_id: &str,
        proxy_id: &str,
        relative_to: &str,
        relative_position: IndexedEntityPosition,
    ) -> Result<bool, ApicizeAppError> {
        let workspace = self.get_workspace_mut(workspace_id)?;
        let result = workspace
            .proxies
            .move_entity(proxy_id, relative_to, relative_position)?;
        Ok(result)
    }

    pub fn update_proxy(
        &mut self,
        workspace_id: &str,
        proxy: Proxy,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(info) => {
                info.dirty = true;
                let id = proxy.get_id();
                let result = info.check_parameter_navigation_update(&proxy, EntityType::Proxy);

                for request_entry in info.workspace.requests.entities.values_mut() {
                    if let Some(s) = request_entry.selected_proxy_as_mut()
                        && s.id == id
                    {
                        s.name = proxy.name.clone();
                    }
                }

                for auth in info.workspace.authorizations.entities.values_mut() {
                    if let Authorization::OAuth2Client {
                        selected_proxy: Some(s),
                        ..
                    } = auth
                        && s.id == id
                    {
                        s.name = proxy.get_name().to_string();
                    }
                }

                if let Some(s) = info.workspace.defaults.selected_proxy_as_mut()
                    && s.id == id
                {
                    s.name = proxy.name.clone();
                }

                info.workspace
                    .proxies
                    .entities
                    .insert(id.to_string(), proxy);
                Ok(result)
            }
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    pub fn update_defaults(
        &mut self,
        workspace_id: &str,
        defaults: WorkbookDefaultParameters,
    ) -> Result<(), ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        info.workspace.defaults = defaults.clone();
        info.workspace.validate_selections();
        Ok(())
    }

    fn insert_default_selection(selection: &Option<Selection>, results: &mut Vec<Selection>) {
        results.insert(
            0,
            Selection {
                id: "\tDEFAULT\t".to_string(),
                name: match selection {
                    Some(s) => {
                        if s.id == NO_SELECTION_ID {
                            "Default (None Configured)".to_string()
                        } else {
                            format!("Default ({})", s.name)
                        }
                    }
                    None => "Default (None Configured)".to_string(),
                },
            },
        );
    }

    /// Find the parent ID for the specified request
    fn get_request_parent_id(request_id: &str, workspace: &Workspace) -> Option<String> {
        let request_id_as_string = request_id.to_string();
        workspace
            .requests
            .child_ids
            .iter()
            .find_map(|(parent_id, child_ids)| {
                if child_ids.contains(&request_id_as_string) {
                    Some(parent_id.to_owned())
                } else {
                    None
                }
            })
    }

    /// Count descendant nodes for capacity estimation
    fn count_descendant_nodes(requests: &IndexedEntities<RequestEntry>, root_id: &str) -> usize {
        let mut count = 0;
        let mut to_count = VecDeque::new();
        to_count.push_back(root_id);
        let mut visited = HashSet::new();

        while let Some(id) = to_count.pop_front() {
            if !visited.insert(id) {
                continue;
            }

            if let Some(child_ids) = requests.child_ids.get(id) {
                count += child_ids.len();
                for child_id in child_ids {
                    to_count.push_back(child_id);
                }
            }
        }

        // Return at least 4 to ensure some pre-allocation benefit
        count.max(4)
    }

    /// Create a copy name with pre-allocated capacity
    fn create_copy_name(original_name: &str) -> String {
        let mut copy_name = String::with_capacity(original_name.len() + 7); // " (Copy)"
        copy_name.push_str(original_name);
        copy_name.push_str(" (Copy)");
        copy_name
    }

    pub fn add_data(
        &mut self,
        workspace_id: &str,
        clone_from_id: Option<&str>,
    ) -> Result<String, ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        let data = match clone_from_id {
            Some(other_id) => match info.workspace.data.iter().find(|data| data.id == other_id) {
                Some(other) => other.clone_as_new(Self::create_copy_name(&other.name)),
                None => return Err(ApicizeAppError::InvalidExternalData(other_id.to_owned())),
            },
            None => ExternalData::default(),
        };
        let id = data.id.clone();
        info.workspace.data.push(data);
        Ok(id)
    }

    pub fn delete_data(
        &mut self,
        workspace_id: &str,
        data_id: &str,
    ) -> Result<(), ApicizeAppError> {
        let info = self.get_workspace_info_mut(workspace_id)?;
        info.dirty = true;
        if let Some(index) = info.workspace.data.iter().position(|d| d.id == data_id) {
            info.workspace.data.remove(index);
        }
        info.workspace.validate_selections();
        Ok(())
    }

    pub fn update_data(
        &mut self,
        workspace_id: &str,
        data: ExternalData,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        match self.workspaces.get_mut(workspace_id) {
            Some(info) => {
                info.dirty = true;

                for request_entry in info.workspace.requests.entities.values_mut() {
                    if let Some(s) = request_entry.selected_data_as_mut()
                        && s.id == data.id
                    {
                        s.name = data.name.clone();
                    }
                }

                if let Some(s) = info.workspace.defaults.selected_data_as_mut()
                    && s.id == data.id
                {
                    s.name = data.name.clone();
                }

                if let Some(index) = info.workspace.data.iter().position(|d| d.id == data.id) {
                    let _ = std::mem::replace(&mut info.workspace.data[index], data);
                }

                Ok(None)
            }
            None => Err(ApicizeAppError::InvalidWorkspace(workspace_id.into())),
        }
    }

    /// Return a list of all external data elements
    pub fn list_data(&self, workspace_id: &str) -> Result<Vec<ExternalData>, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        Ok(workspace.data.clone())
    }

    /// Return specified external data element
    pub fn get_data(
        &self,
        workspace_id: &str,
        data_id: &str,
    ) -> Result<ExternalData, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.data.iter().find(|d| d.id == data_id) {
            Some(data) => Ok(data.clone()),
            None => Err(ApicizeAppError::InvalidExternalData(data_id.into())),
        }
    }

    pub fn get_data_title(
        &self,
        workspace_id: &str,
        data_id: &str,
    ) -> Result<String, ApicizeAppError> {
        let workspace = self.get_workspace(workspace_id)?;
        match workspace.data.iter().find(|d| d.id == data_id) {
            Some(entry) => Ok(entry.get_title()),
            None => Err(ApicizeAppError::InvalidRequest(data_id.into())),
        }
    }

    /// Build a list of parameters, optionally including the default selections
    /// for a specified request
    pub fn list_parameters(
        &self,
        workspace_id: &str,
        active_request_id: Option<&str>,
    ) -> Result<WorkspaceParameters, ApicizeAppError> {
        let info = self.get_workspace_info(workspace_id)?;

        let include_off = true; // active_request_id.is_some();

        let mut scenarios = info
            .navigation
            .scenarios
            .generate_selection_list(include_off);
        let mut authorizations = info
            .navigation
            .authorizations
            .generate_selection_list(include_off);
        let mut certificates = info
            .navigation
            .certificates
            .generate_selection_list(include_off);
        let mut proxies = info.navigation.proxies.generate_selection_list(include_off);
        let mut data = vec![Selection {
            id: NO_SELECTION_ID.to_string(),
            name: "Off".to_string(),
        }];
        data.extend(
            info.workspace
                .data
                .iter()
                .map(|data| Selection {
                    id: data.id.clone(),
                    name: data.name.clone(),
                })
                .collect::<Vec<Selection>>(),
        );

        if let Some(request_id) = active_request_id {
            let mut default_scenario: Option<Selection> = None;
            let mut default_authorization: Option<Selection> = None;
            let mut default_certificate: Option<Selection> = None;
            let mut default_proxy: Option<Selection> = None;
            let mut default_data: Option<Selection> = None;

            let mut id = request_id.to_string();

            loop {
                match info.workspace.requests.entities.get(&id) {
                    Some(request) => {
                        if default_scenario.is_none()
                            && let Some(e) = request.selected_scenario()
                        {
                            default_scenario =
                                if let Some(m) = scenarios.iter().find(|s| s.id == e.id) {
                                    Some(m.clone())
                                } else {
                                    Some(e.clone())
                                };
                        }

                        if default_authorization.is_none()
                            && let Some(e) = request.selected_authorization()
                        {
                            default_authorization =
                                if let Some(m) = authorizations.iter().find(|s| s.id == e.id) {
                                    Some(m.clone())
                                } else {
                                    Some(e.clone())
                                };
                        }

                        if default_certificate.is_none()
                            && let Some(e) = request.selected_certificate()
                        {
                            default_certificate =
                                if let Some(m) = certificates.iter().find(|s| s.id == e.id) {
                                    Some(m.clone())
                                } else {
                                    Some(e.clone())
                                };
                        }

                        if default_proxy.is_none()
                            && let Some(e) = request.selected_proxy()
                        {
                            default_proxy = if let Some(m) = proxies.iter().find(|s| s.id == e.id) {
                                Some(m.clone())
                            } else {
                                Some(e.clone())
                            };
                        }

                        if default_data.is_none()
                            && let Some(e) = request.selected_data()
                        {
                            default_data = if let Some(m) = data.iter().find(|s| s.id == e.id) {
                                Some(m.clone())
                            } else {
                                Some(e.clone())
                            };
                        }
                    }
                    None => return Err(ApicizeAppError::InvalidRequest(id.to_string())),
                }

                // If we have assigned all then exit loop
                if default_scenario.is_some()
                    && default_authorization.is_some()
                    && default_certificate.is_some()
                    && default_proxy.is_some()
                    && default_data.is_some()
                {
                    break;
                }

                // Get the next parent ID, if there is one
                match Self::get_request_parent_id(&id, &info.workspace) {
                    Some(parent_id) => id = parent_id,
                    None => {
                        break;
                    }
                }
            }

            if default_scenario.is_none() {
                default_scenario = match &info.workspace.defaults.selected_scenario {
                    Some(s) => info
                        .workspace
                        .scenarios
                        .entities
                        .get(&s.id)
                        .map(|e| Selection {
                            id: e.id.to_string(),
                            name: e.name.to_string(),
                        }),
                    None => None,
                }
            }
            if default_authorization.is_none() {
                default_authorization = match &info.workspace.defaults.selected_authorization {
                    Some(s) => {
                        info.workspace
                            .authorizations
                            .entities
                            .get(&s.id)
                            .map(|e| Selection {
                                id: e.get_id().to_string(),
                                name: e.get_name().to_string(),
                            })
                    }
                    None => None,
                }
            }
            if default_certificate.is_none() {
                default_certificate = match &info.workspace.defaults.selected_certificate {
                    Some(s) => info
                        .workspace
                        .certificates
                        .entities
                        .get(&s.id)
                        .map(|e| Selection {
                            id: e.get_id().to_string(),
                            name: e.get_name().to_string(),
                        }),
                    None => None,
                }
            }
            if default_proxy.is_none() {
                default_proxy = match &info.workspace.defaults.selected_proxy {
                    Some(s) => info
                        .workspace
                        .proxies
                        .entities
                        .get(&s.id)
                        .map(|e| Selection {
                            id: e.get_id().to_string(),
                            name: e.name.to_string(),
                        }),
                    None => None,
                }
            }
            if default_data.is_none() {
                default_data = match &info.workspace.defaults.selected_data {
                    Some(s) => {
                        info.workspace
                            .data
                            .iter()
                            .find(|d| d.id == s.id)
                            .map(|e| Selection {
                                id: e.get_id().to_string(),
                                name: e.name.to_string(),
                            })
                    }
                    None => None,
                }
            }

            Self::insert_default_selection(&default_scenario, &mut scenarios);
            Self::insert_default_selection(&default_authorization, &mut authorizations);
            Self::insert_default_selection(&default_certificate, &mut certificates);
            Self::insert_default_selection(&default_proxy, &mut proxies);
            Self::insert_default_selection(&default_data, &mut data);
        }

        Ok(WorkspaceParameters {
            scenarios,
            authorizations,
            certificates,
            proxies,
            data,
        })
    }
}

impl WorkspaceInfo {
    /// Check parameter and returns update to navigation if required
    pub fn check_parameter_navigation_update<T: Identifiable + Validated>(
        &mut self,
        parameter: &T,
        entity_type: EntityType,
    ) -> Option<UpdatedNavigationEntry> {
        let section = match entity_type {
            EntityType::Scenario => &mut self.navigation.scenarios,
            EntityType::Authorization => &mut self.navigation.authorizations,
            EntityType::Certificate => &mut self.navigation.certificates,
            EntityType::Proxy => &mut self.navigation.proxies,
            _ => {
                return None;
            }
        };

        let id = parameter.get_id();
        let nav_name = parameter.get_title();
        let validation_state = parameter.get_validation_state();
        // let execution_state = parameter.get_execution_state();

        let mut entry = section.public.iter_mut().find(|e| e.id == id);
        if entry.is_none() {
            entry = section.private.iter_mut().find(|e| e.id == id);
        }
        if entry.is_none() {
            entry = section.vault.iter_mut().find(|e| e.id == id);
        }

        if let Some(e) = entry {
            e.name = nav_name.to_string();
            e.validation_state = validation_state.clone();
            // e.execution_state = execution_state.clone();
            Some(UpdatedNavigationEntry {
                id: id.to_string(),
                name: nav_name.to_string(),
                entity_type,
                validation_state: Some(validation_state.clone()),
                execution_state: None, // execution_state.cloned(),
            })
        } else {
            None
        }
    }

    pub fn check_request_navigation_update(
        &mut self,
        id: &str,
        name: &str,
        validation_state: Option<&ValidationState>,
        execution_state: Option<&ExecutionState>,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        Self::check_request_navigation_update_int(
            id,
            name,
            validation_state,
            execution_state,
            &mut self.navigation.requests,
        )
    }

    /// Check request navigation name and returns update to navigation if required
    fn check_request_navigation_update_int(
        id: &str,
        name: &str,
        validation_state: Option<&ValidationState>,
        execution_state: Option<&ExecutionState>,
        entries: &mut Vec<NavigationRequestEntry>,
    ) -> Result<Option<UpdatedNavigationEntry>, ApicizeAppError> {
        for entry in entries {
            let validation_passes: bool = match validation_state {
                Some(state) => entry.validation_state.eq(state),
                None => true,
            };

            let execution_passes: bool = match execution_state {
                Some(state) => entry.execution_state.eq(state),
                None => true,
            };

            if id == entry.id && (entry.name != name || !validation_passes || !execution_passes) {
                entry.name = name.to_string();
                if let Some(state) = validation_state {
                    entry.validation_state = state.clone();
                }
                if let Some(state) = execution_state {
                    entry.execution_state = *state;
                }
                return Ok(Some(UpdatedNavigationEntry {
                    id: id.to_string(),
                    name: name.to_string(),
                    entity_type: EntityType::RequestEntry,
                    validation_state: validation_state.cloned(),
                    execution_state: execution_state.cloned(),
                }));
            }

            if let Some(children) = &mut entry.children {
                let result = Self::check_request_navigation_update_int(
                    id,
                    name,
                    validation_state,
                    execution_state,
                    children,
                )?;
                if result.is_some() {
                    return Ok(result);
                }
            }
        }
        Ok(None)
    }

    pub fn get_clipboard_payload(
        &self,
        payload_request: ClipboardPayloadRequest,
        indent: usize,
    ) -> Result<Option<PersistableData>, ApicizeAppError> {
        let get_request = |request_id: &str| {
            let request_entry = self
                .workspace
                .requests
                .entities
                .get(request_id)
                .ok_or(ApicizeAppError::InvalidRequest(request_id.to_string()))?;
            if let RequestEntry::Request(request) = request_entry {
                Ok(request)
            } else {
                Err(ApicizeAppError::InvalidRequest(request_id.to_string()))
            }
        };

        let get_execution_summaries =
            |exec_ctr: &usize| self.execution_results.get_result_summaries(exec_ctr);
        let get_request_execution_detail = |exec_ctr: &usize| {
            let result = self.execution_results.get_detail(exec_ctr)?;
            if let ExecutionResultDetail::Request(detail) = result {
                Ok(detail)
            } else {
                Err(ApicizeAppError::InvalidExecution(*exec_ctr))
            }
        };

        match payload_request {
            ClipboardPayloadRequest::RequestBody { request_id } => {
                if let Some(body) = &get_request(&request_id)?.body {
                    match body {
                        RequestBody::Text { data } => {
                            Ok(Some(PersistableData::Text(data.to_string())))
                        }
                        RequestBody::JSON { data } => {
                            Ok(Some(PersistableData::Text(data.to_string())))
                        }
                        RequestBody::XML { data } => {
                            Ok(Some(PersistableData::Text(data.to_string())))
                        }
                        RequestBody::Form { data } => Ok(Some(PersistableData::Text(
                            serde_urlencoded::to_string(
                                data.iter()
                                    .map(|d| (d.name.to_string(), d.value.to_string()))
                                    .collect::<(String, String)>(),
                            )
                            .map_err(|err| ApicizeAppError::ClipboardError(err.to_string()))?
                            .to_owned(),
                        ))),
                        RequestBody::Raw { data } => {
                            Ok(Some(PersistableData::Binary(data.clone())))
                        }
                    }
                } else {
                    Ok(None)
                }
            }
            ClipboardPayloadRequest::RequestTest { request_id } => {
                let request = get_request(&request_id)?;
                if let Some(test) = &request.test
                    && !test.is_empty()
                {
                    Ok(Some(PersistableData::Text(test.to_string())))
                } else {
                    Ok(None)
                }
            }
            ClipboardPayloadRequest::ResponseSummaryJson { exec_ctr } => {
                match Workspace::geneate_report(
                    &exec_ctr,
                    &get_execution_summaries(&exec_ctr),
                    ExecutionReportFormat::JSON,
                ) {
                    Ok(data) => Ok(Some(PersistableData::Text(data))),
                    Err(err) => Err(ApicizeAppError::ApicizeError(err)),
                }
            }
            ClipboardPayloadRequest::ResponseSummaryCsv { exec_ctr } => {
                match Workspace::geneate_report(
                    &exec_ctr,
                    &get_execution_summaries(&exec_ctr),
                    ExecutionReportFormat::CSV,
                ) {
                    Ok(data) => Ok(Some(PersistableData::Text(data))),
                    Err(err) => Err(ApicizeAppError::ApicizeError(err)),
                }
            }
            ClipboardPayloadRequest::ResponseBodyRaw { exec_ctr } => {
                let detail = get_request_execution_detail(&exec_ctr)?;
                if let Some(response) = &detail.test_context.response
                    && let Some(body) = &response.body
                {
                    match body {
                        apicize_lib::ApicizeBody::Text { text } => {
                            Ok(Some(PersistableData::Text(text.to_string())))
                        }
                        apicize_lib::ApicizeBody::JSON { text, .. } => {
                            Ok(Some(PersistableData::Text(text.to_string())))
                        }
                        apicize_lib::ApicizeBody::XML { text, .. } => {
                            Ok(Some(PersistableData::Text(text.to_string())))
                        }
                        apicize_lib::ApicizeBody::Form { text, .. } => {
                            Ok(Some(PersistableData::Text(text.to_string())))
                        }
                        apicize_lib::ApicizeBody::Binary { data } => {
                            Ok(Some(PersistableData::Binary(data.clone())))
                        }
                    }
                } else {
                    Ok(None)
                }
            }
            ClipboardPayloadRequest::ResponseBodyPreview { exec_ctr } => {
                let detail = get_request_execution_detail(&exec_ctr)?;
                if let Some(response) = &detail.test_context.response
                    && let Some(body) = &response.body
                {
                    match body {
                        apicize_lib::ApicizeBody::Text { text } => {
                            Ok(Some(PersistableData::Text(text.to_string())))
                        }
                        apicize_lib::ApicizeBody::JSON { data, .. } => {
                            let mut buf = Vec::new();
                            let spacer = " ".repeat(indent);
                            let formatter = PrettyFormatter::with_indent(spacer.as_bytes());
                            let mut serializer =
                                serde_json::Serializer::with_formatter(&mut buf, formatter);
                            data.serialize(&mut serializer)?;
                            Ok(Some(PersistableData::Text(String::from_utf8(buf)?)))
                        }
                        apicize_lib::ApicizeBody::XML { data, .. } => {
                            Ok(Some(PersistableData::Text(serde_xml_rs::to_string(&data)?)))
                        }
                        apicize_lib::ApicizeBody::Form { data, .. } => {
                            Ok(Some(PersistableData::Text(
                                data.iter()
                                    .map(|(name, value)| format!("{name} = {value}"))
                                    .collect::<Vec<String>>()
                                    .join("\n"),
                            )))
                        }
                        apicize_lib::ApicizeBody::Binary { data } => {
                            Ok(Some(PersistableData::Binary(data.clone())))
                        }
                    }
                } else {
                    Ok(None)
                }
            }
            ClipboardPayloadRequest::ResponseDetail { exec_ctr } => {
                let detail: &ExecutionResultDetail =
                    self.execution_results.get_detail(&exec_ctr)?;

                Ok(Some(PersistableData::Text(serde_json::to_string_pretty(
                    detail,
                )?)))
            }
        }
    }

    pub fn get_execution_mut(&mut self, request_or_group_id: &str) -> &mut RequestExecution {
        // Use entry API to get or insert and return mutable reference
        self.executions
            .entry(request_or_group_id.to_string())
            .or_insert_with(|| RequestExecution {
                menu: vec![],
                execution_state: ExecutionState::empty(),
                active_summaries: IndexMap::default(),
            })
    }

    fn get_navigation_int<'a>(
        request_or_group_id: &str,
        entries: &'a Vec<NavigationRequestEntry>,
    ) -> Option<&'a NavigationRequestEntry> {
        for entry in entries {
            if entry.id == request_or_group_id {
                return Some(entry);
            }
            if let Some(children) = &entry.children {
                return WorkspaceInfo::get_navigation_int(request_or_group_id, children);
            }
        }
        None
    }

    pub fn get_navigation<'a>(
        &'a self,
        request_or_group_id: &str,
    ) -> Option<&'a NavigationRequestEntry> {
        WorkspaceInfo::get_navigation_int(request_or_group_id, &self.navigation.requests)
    }

    fn get_navigation_int_mut<'a>(
        request_or_group_id: &str,
        entries: &'a mut Vec<NavigationRequestEntry>,
    ) -> Option<&'a mut NavigationRequestEntry> {
        for entry in entries {
            if entry.id == request_or_group_id {
                return Some(entry);
            }
            if let Some(children) = &mut entry.children {
                return WorkspaceInfo::get_navigation_int_mut(request_or_group_id, children);
            }
        }
        None
    }

    pub fn get_navigation_mut<'a>(
        &'a mut self,
        request_or_group_id: &str,
    ) -> Option<&'a mut NavigationRequestEntry> {
        WorkspaceInfo::get_navigation_int_mut(request_or_group_id, &mut self.navigation.requests)
    }

    pub fn get_running_request_ids(&self) -> HashSet<String> {
        self.executions
            .iter()
            .filter_map(|(request_or_group_id, exec)| {
                if exec.execution_state == ExecutionState::RUNNING {
                    Some(request_or_group_id.to_string())
                } else {
                    None
                }
            })
            .collect::<HashSet<String>>()
    }

    fn gather_execution_states(
        exec_ctr: usize,
        parent_state: Option<ExecutionState>,
        summaries: &Vec<&ExecutionResultSummary>,
        states: &mut HashMap<usize, ExecutionState>,
    ) {
        if let Some(summary) = summaries.iter().find(|s| s.exec_ctr == exec_ctr) {
            let mut new_execution_state = match &summary.success {
                ExecutionResultSuccess::Success => ExecutionState::SUCCESS,
                ExecutionResultSuccess::Failure => ExecutionState::FAILURE,
                ExecutionResultSuccess::Error => ExecutionState::ERROR,
            };

            if let Some(state) = parent_state {
                new_execution_state |= state;
            }

            if let Some(state) = states.get(&exec_ctr) {
                new_execution_state |= state.to_owned();
            }

            states.insert(exec_ctr.to_owned(), new_execution_state);

            if let Some(parent_ctr) = &summary.parent_exec_ctr {
                WorkspaceInfo::gather_execution_states(
                    parent_ctr.to_owned(),
                    Some(new_execution_state),
                    summaries,
                    states,
                );
            }
        }
    }

    /// Build a request's menu items based upon the result
    pub fn build_result_menu_items(
        &self,
        request_or_group_id: &str,
    ) -> Result<Vec<ExecutionMenuItem>, ApicizeAppError> {
        // let request = self
        //     .workspace
        //     .requests
        //     .get(request_or_group_id)
        //     .ok_or_else(|| ApicizeAppError::InvalidRequest(request_or_group_id.to_string()))?;

        // let name = result.get_title();
        let result_summaries = self
            .execution_results
            .get_summaries(request_or_group_id, true);

        let mut results = Vec::<ExecutionMenuItem>::default();
        let mut prev_exec_ctr: Option<usize> = None;
        for (executing_request_or_group_id, summaries) in result_summaries {
            let mut executing_offset: usize = 0;
            if let Some(first) = summaries.first() {
                let level_offset = if executing_request_or_group_id == request_or_group_id {
                    0
                } else {
                    first.level
                };

                let mut execution_states =
                    HashMap::<usize, ExecutionState>::with_capacity(summaries.len());

                for exec_ctr in summaries.iter().map(|s| s.exec_ctr) {
                    WorkspaceInfo::gather_execution_states(
                        exec_ctr,
                        None,
                        &summaries,
                        &mut execution_states,
                    );
                }

                let all_exec_ctrs = summaries
                    .iter()
                    .map(|s| s.exec_ctr)
                    .collect::<HashSet<usize>>();
                for summary in &summaries {
                    let (parent_exec_ctr, suffix) = if let Some(pec) = &summary.parent_exec_ctr {
                        if all_exec_ctrs.contains(pec) {
                            (Some(*pec), None)
                        } else if let Ok((parent, _)) = self.execution_results.get_result(pec) {
                            let mut suffixes = Vec::<String>::with_capacity(2);
                            if let Some(run_number) = parent.run_number
                                && let Some(run_count) = parent.run_count
                            {
                                suffixes.push(format!("Run {run_number} of {run_count}"));
                            }
                            if let Some(row_number) = parent.row_number
                                && let Some(row_count) = parent.row_count
                            {
                                suffixes.push(format!("Row {row_number} of {row_count}"));
                            }

                            (
                                None,
                                if suffixes.is_empty() {
                                    None
                                } else {
                                    Some(suffixes.join(", "))
                                },
                            )
                        } else {
                            (None, None)
                        }
                    } else {
                        (None, None)
                    };

                    results.push(ExecutionMenuItem {
                        name: if let Some(suffix) = suffix {
                            format!("{} ({})", summary.name, suffix)
                        } else {
                            summary.name.clone()
                        },
                        level: summary.level - level_offset,
                        executing_name: if executing_request_or_group_id == request_or_group_id {
                            None
                        } else {
                            self.workspace
                                .requests
                                .get(&executing_request_or_group_id)
                                .map(|r| r.get_title())
                        },
                        execution_state: execution_states
                            .get(&summary.exec_ctr)
                            .unwrap_or(&ExecutionState::ERROR)
                            .to_owned(),
                        executing_request_or_group_id: executing_request_or_group_id.clone(),
                        executing_offset,
                        exec_ctr: summary.exec_ctr,
                        next_exec_ctr: None,
                        prev_exec_ctr,
                        parent_exec_ctr,
                    });

                    executing_offset += 1;
                    prev_exec_ctr = Some(summary.exec_ctr);
                }
            }
        }

        if results.len() > 1 {
            for i in 0..results.len() {
                if let Some(next_exec_ctr) = results.get(i + 1).map(|r| r.exec_ctr) {
                    let here = results.get_mut(i).unwrap();
                    here.next_exec_ctr = Some(next_exec_ctr);
                }
            }
        }
        Ok(results)
    }
}

#[derive(Serialize_repr, Deserialize_repr, Copy, Clone, Debug)]
#[repr(u8)]
pub enum EntityType {
    RequestEntry = 1,
    Request = 2,
    Group = 3,
    Scenario = 6,
    Authorization = 7,
    Certificate = 8,
    Proxy = 9,
    Data = 10,
    Parameters = 11,
    Defaults = 12,
    Warnings = 13,
    DataList = 14,
    RequestBody = 101,
}

impl EntityType {
    fn as_str(&self) -> &'static str {
        match self {
            EntityType::RequestEntry => "RequestEntry",
            EntityType::Request => "Request",
            EntityType::Group => "Group",
            EntityType::Scenario => "Scenario",
            EntityType::Authorization => "Authorization",
            EntityType::Certificate => "Certificate",
            EntityType::Proxy => "Proxy",
            EntityType::Data => "Data",
            EntityType::Parameters => "Parameters",
            EntityType::Defaults => "Defaults",
            EntityType::Warnings => "Warnings",
            EntityType::DataList => "DataList",
            EntityType::RequestBody => "RequestBody",
        }
    }
}

impl Display for EntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(tag = "entityTypeName")]
pub enum Entity {
    RequestEntry(RequestEntryInfo),
    Request(Request),
    Group(RequestGroup),
    RequestBody(RequestBodyInfoWithBody),
    Scenario(Scenario),
    Authorization(Authorization),
    Certificate(Certificate),
    Proxy(Proxy),
    Data(ExternalData),
    DataList { list: Vec<ExternalData> },
    Defaults(WorkbookDefaultParameters),
}

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(tag = "entityTypeName")]
pub enum Entities {
    Parameters(WorkspaceParameters),
    DataList { data: Vec<ExternalData> },
    Defaults(WorkbookDefaultParameters),
}

#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub struct WorkspaceParameters {
    pub scenarios: Vec<Selection>,
    pub authorizations: Vec<Selection>,
    pub certificates: Vec<Selection>,
    pub proxies: Vec<Selection>,
    pub data: Vec<Selection>,
}

pub struct OpenWorkspaceResult {
    pub workspace_id: String,
    pub display_name: String,
    pub error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "payloadType")]
pub enum ClipboardPayloadRequest {
    #[serde(rename_all = "camelCase")]
    RequestBody { request_id: String },
    #[serde(rename_all = "camelCase")]
    RequestTest { request_id: String },
    #[serde(rename_all = "camelCase")]
    ResponseSummaryJson { exec_ctr: usize },
    #[serde(rename_all = "camelCase")]
    ResponseSummaryCsv { exec_ctr: usize },
    #[serde(rename_all = "camelCase")]
    ResponseBodyRaw { exec_ctr: usize },
    #[serde(rename_all = "camelCase")]
    ResponseBodyPreview { exec_ctr: usize },
    #[serde(rename_all = "camelCase")]
    ResponseDetail { exec_ctr: usize },
}

/// Describe data to read and write from clipboard or file
pub enum PersistableData {
    Text(String),
    Binary(Vec<u8>),
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionMenuItem {
    pub name: String,
    pub level: usize,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub executing_name: Option<String>,
    pub execution_state: ExecutionState,

    pub executing_request_or_group_id: String,
    pub executing_offset: usize,
    pub exec_ctr: usize,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_exec_ctr: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prev_exec_ctr: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_exec_ctr: Option<usize>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestExecution {
    pub menu: Vec<ExecutionMenuItem>,
    pub execution_state: ExecutionState,
    pub active_summaries: IndexMap<usize, ExecutionResultSummary>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "eventType")]
/// Structure to report execution results to application
pub enum ExecutionEvent {
    #[serde(rename_all = "camelCase")]
    Start { execution_state: ExecutionState },
    #[serde(rename_all = "camelCase")]
    Cancel { execution_state: ExecutionState },
    #[serde(rename_all = "camelCase")]
    Complete(RequestExecution),
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// Structure of information required to launch an Apicize workspace
pub struct WorkspaceInitialization {
    /// Workspace session
    pub session: Session,
    /// Navigation
    pub navigation: Navigation,
    /// State information for saving the workbook
    pub save_state: SessionSaveState,
    /// Execution information cached client-side
    pub executions: FxHashMap<String, ExecutionEvent>,
    /// Workbook default parameters
    pub defaults: WorkbookDefaultParameters,
    /// Application settings
    pub settings: ApicizeSettings,
    /// Message to display to user if something wrong happened during startup   
    pub error: Option<String>,
}

#[derive(Clone, Copy, Serialize, Deserialize)]
#[repr(u8)]
pub enum WorkspaceMode {
    Normal = 0,
    Help = 1,
    Settings = 2,
    Defaults = 3,
    // Warnings,
    Console = 4,
    RequestList = 5,
    ScenarioList = 6,
    AuthorizationList = 7,
    CertificateList = 8,
    ProxyList = 9,
}

impl From<u8> for WorkspaceMode {
    fn from(val: u8) -> Self {
        match val {
            0 => WorkspaceMode::Normal,
            1 => WorkspaceMode::Help,
            2 => WorkspaceMode::Settings,
            3 => WorkspaceMode::Defaults,
            // Warnings,
            4 => WorkspaceMode::Console,
            5 => WorkspaceMode::RequestList,
            6 => WorkspaceMode::ScenarioList,
            7 => WorkspaceMode::AuthorizationList,
            8 => WorkspaceMode::CertificateList,
            9 => WorkspaceMode::ProxyList,
            _ => panic!("Invalid status value"),
        }
    }
}
