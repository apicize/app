use apicize_lib::{
    ExecutionConcurrency, NameValuePair, Request, RequestBody, RequestMethod, Selection,
};
use serde::{Deserialize, Serialize};

use crate::workspaces::{DEFAULT_SELECTION_ID, EntityType, RequestBodyInfo};

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequestUpdate {
    pub id: String,
    pub entity_type: EntityType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<RequestMethod>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runs: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multi_run_execution: Option<ExecutionConcurrency>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_alive: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accept_invalid_certs: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub number_of_redirects: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub query_string_params: Option<Vec<NameValuePair>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<Vec<NameValuePair>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<Option<RequestBody>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_length: Option<usize>,
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

impl RequestUpdate {
    pub fn from_body_info(body_info: RequestBodyInfo) -> Self {
        RequestUpdate {
            id: body_info.id.to_string(),
            entity_type: EntityType::Request,
            body: Some(body_info.body),
            body_mime_type: body_info.body_mime_type,
            body_length: body_info.body_length,
            name: None,
            disabled: None,
            key: None,
            url: None,
            method: None,
            runs: None,
            multi_run_execution: None,
            timeout: None,
            keep_alive: None,
            accept_invalid_certs: None,
            number_of_redirects: None,
            query_string_params: None,
            headers: None,
            test: None,
            selected_scenario: None,
            selected_authorization: None,
            selected_certificate: None,
            selected_proxy: None,
            selected_data: None,
            validation_warnings: None,
        }
    }

    pub fn from_selections(request: &Request) -> Self {
        RequestUpdate {
            id: request.id.to_string(),
            entity_type: EntityType::Request,
            name: None,
            disabled: None,
            key: None,
            url: None,
            method: None,
            runs: None,
            multi_run_execution: None,
            timeout: None,
            keep_alive: None,
            accept_invalid_certs: None,
            number_of_redirects: None,
            query_string_params: None,
            headers: None,
            test: None,
            body: None,
            body_mime_type: None,
            body_length: None,
            selected_scenario: if let Some(selection) = &request.selected_scenario {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_authorization: if let Some(selection) = &request.selected_authorization {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_certificate: if let Some(selection) = &request.selected_certificate {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_proxy: if let Some(selection) = &request.selected_proxy {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_data: if let Some(selection) = &request.selected_data {
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
