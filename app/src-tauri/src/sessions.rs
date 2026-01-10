use std::collections::HashMap;

use rustc_hash::FxHashMap;

use serde::{Deserialize, Serialize};

use crate::{
    error::ApicizeAppError,
    workspaces::{EntityType, ExecutionMenuItem, WorkspaceMode},
};

/// A Session is the information associated with an open Apicize workspace window,
/// a workspace may have more than one active session
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    /// Session ID associated with the session
    pub workspace_id: String,
    /// Track which request is active in the session, if any
    pub active_entity: Option<SessionEntity>,
    /// Expanded item IDs
    pub expanded_items: Option<Vec<String>>,
    /// Track which exec ctr is selected for each request or group
    pub request_exec_ctrs: HashMap<String, usize>,
    /// Current session mode (what is being displayed)
    pub mode: WorkspaceMode,
    /// Most recent help topic
    pub help_topic: Option<String>,
    /// Which execution result view state is for each request's results in a session
    pub execution_result_view_state: HashMap<String, ExecutionResultViewState>,
}

/// Session active / selected entity
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionEntity {
    /// ID of active request or group
    pub entity_id: String,
    /// Active executction counter, if any
    pub entity_type: EntityType,
}

#[derive(Default)]
pub struct Sessions {
    pub sessions: FxHashMap<String, Session>,
    pub counter: u64,
}

impl Sessions {
    pub fn trace_all_sessions(&self) {
        println!("   Sessions:");
        for (id, info) in &self.sessions {
            println!("      ID: {}, Workspace: {}", id, info.workspace_id);
        }
    }

    pub fn add_session(&mut self, session: Session) -> String {
        let session_id = if self.counter == 0 {
            "main".to_string()
        } else {
            let mut id = String::with_capacity(8); // "main-" + digits
            id.push_str("main-");
            use std::fmt::Write;
            write!(&mut id, "{}", self.counter).unwrap();
            id
        };

        self.counter += 1;
        self.sessions.insert(session_id.clone(), session);
        session_id
    }

    pub fn remove_session(&mut self, session_id: &str) -> Result<(), ApicizeAppError> {
        // log::trace!("Removing session {}", &session_id);
        match self.sessions.remove(session_id) {
            Some(_) => Ok(()),
            None => Err(ApicizeAppError::InvaliedSession(session_id.into())),
        }
    }

    pub fn get_session(&self, session_id: &str) -> Result<&Session, ApicizeAppError> {
        match self.sessions.get(session_id) {
            Some(session) => Ok(session),
            None => Err(ApicizeAppError::InvaliedSession(session_id.into())),
        }
    }

    pub fn get_session_mut(&mut self, session_id: &str) -> Result<&mut Session, ApicizeAppError> {
        match self.sessions.get_mut(session_id) {
            Some(session) => Ok(session),
            None => Err(ApicizeAppError::InvaliedSession(session_id.into())),
        }
    }

    pub fn get_workspace_session_ids(&self, workspace_id: &str) -> Vec<&str> {
        self.sessions
            .iter()
            .filter(|(_, s)| s.workspace_id == workspace_id)
            .map(|(id, _)| id.as_str())
            .collect()
    }

    pub fn count(&self) -> usize {
        self.sessions.len()
    }

    pub fn change_workspace(
        &mut self,
        session_id: &str,
        workspace_id: &str,
    ) -> Result<&mut Session, ApicizeAppError> {
        match self.sessions.get_mut(session_id) {
            Some(session) => {
                session.workspace_id = workspace_id.to_string();
                Ok(session)
            }
            None => Err(ApicizeAppError::InvaliedSession(session_id.into())),
        }
    }
}

impl Session {
    /// Update the session's active entity if it is an acceptable type  
    pub fn update_active_entity(
        &mut self,
        entity: &Option<SessionEntity>,
    ) -> Result<(), ApicizeAppError> {
        let ok = match entity {
            Some(entity) => matches!(
                entity.entity_type,
                EntityType::RequestEntry
                    | EntityType::Request
                    | EntityType::Group
                    | EntityType::Scenario
                    | EntityType::Authorization
                    | EntityType::Certificate
                    | EntityType::Proxy
            ),
            None => false,
        };
        if ok {
            self.active_entity = entity.clone();
            Ok(())
        } else {
            Err(ApicizeAppError::InvalidTypeForOperation(
                entity.as_ref().unwrap().entity_type,
            ))
        }
    }

    /// Track the selected exec ctr for the specified request for this session
    pub fn set_request_exec_ctr(&mut self, request_or_group_id: &str, exec_ctr: &usize) {
        self.request_exec_ctrs
            .insert(request_or_group_id.to_string(), *exec_ctr);
    }

    /// Remove the selected exec ctr for the specified request (i.e. it was deleted)
    pub fn remove_request_exec_ctr(&mut self, request_or_group_id: &str) {
        self.request_exec_ctrs.remove(request_or_group_id);
    }

    /// Check to see if the session's exec counter for the request would change based upon the newly generated result menu,
    /// return the valid execution counter
    pub fn check_execution_counter(
        &mut self,
        request_or_group_id: &str,
        old_menu: &Option<Vec<ExecutionMenuItem>>,
        new_menu: &[ExecutionMenuItem],
    ) -> Option<usize> {
        let existing_exec_ctr = self.request_exec_ctrs.get(request_or_group_id);
        let new_exec_ctr = match new_menu.first() {
            Some(first_item) => {
                if existing_exec_ctr.is_some()
                    && let Some(existing_old_menu) = old_menu
                    && let Some(active_exec_ctr) = existing_exec_ctr
                    && let Some(a) = existing_old_menu
                        .iter()
                        .find(|i| i.exec_ctr == *active_exec_ctr)
                {
                    // If the old and new menu have the same number of executions for the active menu item's execution request, then use
                    let old_exec_count = existing_old_menu
                        .iter()
                        .filter(|i| {
                            i.executing_request_or_group_id == a.executing_request_or_group_id
                        })
                        .count();
                    let new_exec_items = new_menu
                        .iter()
                        .filter(|i| {
                            i.executing_request_or_group_id == a.executing_request_or_group_id
                        })
                        .collect::<Vec<&ExecutionMenuItem>>();
                    let new_exec_count = new_exec_items.len();

                    if old_exec_count == new_exec_count
                        && let Some(b) = new_exec_items
                            .iter()
                            .find(|i| i.executing_offset == a.executing_offset)
                    {
                        Some(b.exec_ctr)
                    } else {
                        Some(first_item.exec_ctr)
                    }
                } else {
                    // If no active exec counter, then piuseck the first result
                    Some(first_item.exec_ctr)
                }
            }
            None => None,
        };

        if let Some(exec_ctr) = &new_exec_ctr {
            self.request_exec_ctrs
                .insert(request_or_group_id.to_string(), exec_ctr.to_owned());
        } else {
            self.request_exec_ctrs.remove(request_or_group_id);
        }

        new_exec_ctr
    }

    /// Retrieve execution result view state for the specified request, defaultin to all hidden
    pub fn get_execution_result_view_state(&self, request_id: &str) -> &ExecutionResultViewState {
        static DEFAULT_VIEW_STATE: ExecutionResultViewState = ExecutionResultViewState {
            hide_success: false,
            hide_failure: false,
            hide_error: false,
            exec_ctr: None,
        };

        self.execution_result_view_state
            .get(request_id)
            .unwrap_or(&DEFAULT_VIEW_STATE)
    }

    /// Remove execution result view state for the specified request
    pub fn remove_execution_result_view_state(&mut self, request_id: &str) {
        self.execution_result_view_state.remove(request_id);
    }

    /// Store execution result view state for the specified request
    pub fn update_execution_result_view_state(
        &mut self,
        request_id: &str,
        execution_result_view_state: ExecutionResultViewState,
    ) {
        self.execution_result_view_state
            .insert(request_id.to_string(), execution_result_view_state);
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSaveState {
    pub file_name: String,
    pub display_name: String,
    pub dirty: bool,
    pub editor_count: usize,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionState {
    pub dirty: bool,
}

#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResultViewState {
    pub hide_success: bool,
    pub hide_failure: bool,
    pub hide_error: bool,
    pub exec_ctr: Option<usize>,
}
