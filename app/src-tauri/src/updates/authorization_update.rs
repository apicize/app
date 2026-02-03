use apicize_lib::Selection;
use serde::{Deserialize, Serialize};

use crate::workspaces::{DEFAULT_SELECTION_ID, EntityType};

#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub enum AuthorizationUpdateType {
    Basic,
    OAuth2Client,
    OAuth2Pkce,
    ApiKey,
}

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthorizationUpdate {
    pub id: String,
    pub entity_type: EntityType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth_type: Option<AuthorizationUpdateType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub header: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub access_token_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub authorize_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audience: Option<Option<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<Option<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_certificate: Option<Selection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_proxy: Option<Selection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub send_credentials_in_body: Option<Option<bool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_warnings: Option<Vec<String>>,
}

impl AuthorizationUpdate {
    pub fn from_selections(
        id: &str,
        selected_certificate: &Option<Selection>,
        selected_proxy: &Option<Selection>,
    ) -> Self {
        AuthorizationUpdate {
            id: id.to_string(),
            entity_type: EntityType::Authorization,
            name: None,
            auth_type: None,
            username: None,
            password: None,
            header: None,
            value: None,
            access_token_url: None,
            authorize_url: None,
            client_id: None,
            client_secret: None,
            audience: None,
            scope: None,
            send_credentials_in_body: None,
            selected_certificate: if let Some(selection) = selected_certificate {
                Some(selection.clone())
            } else {
                Some(Selection {
                    id: DEFAULT_SELECTION_ID.to_string(),
                    name: "".to_string(),
                })
            },
            selected_proxy: if let Some(selection) = selected_proxy {
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
