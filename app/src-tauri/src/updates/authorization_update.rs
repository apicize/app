use apicize_lib::{Selection, authorization::AuthorizationPlain};
use serde::{Deserialize, Serialize};

use crate::workspaces::EntityType;

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
    pub encrypted: Option<bool>,
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
    pub audience: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
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
        selected_certificate: &Selection,
        selected_proxy: &Selection,
    ) -> Self {
        AuthorizationUpdate {
            id: id.to_string(),
            entity_type: EntityType::Authorization,
            encrypted: Some(false),
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
            selected_certificate: Some(selected_certificate.clone()),
            selected_proxy: Some(selected_proxy.clone()),
            validation_warnings: None,
        }
    }
}

impl From<AuthorizationPlain> for AuthorizationUpdate {
    fn from(value: AuthorizationPlain) -> Self {
        match value {
            AuthorizationPlain::Basic {
                id,
                name,
                username,
                password,
                validation_warnings,
                ..
            } => AuthorizationUpdate {
                id,
                entity_type: EntityType::Authorization,
                encrypted: Some(false),
                auth_type: Some(AuthorizationUpdateType::Basic),
                name: Some(name),
                username: Some(username),
                password: Some(password),
                header: None,
                value: None,
                access_token_url: None,
                authorize_url: None,
                client_id: None,
                client_secret: None,
                audience: None,
                scope: None,
                selected_certificate: None,
                selected_proxy: None,
                send_credentials_in_body: None,
                validation_warnings: Some(validation_warnings.unwrap_or_default()),
            },
            AuthorizationPlain::OAuth2Client {
                id,
                name,
                access_token_url,
                client_id,
                client_secret,
                audience,
                scope,
                selected_certificate,
                selected_proxy,
                send_credentials_in_body,
                validation_warnings,
                ..
            } => AuthorizationUpdate {
                id,
                entity_type: EntityType::Authorization,
                encrypted: Some(false),
                auth_type: Some(AuthorizationUpdateType::OAuth2Client),
                name: Some(name),
                username: None,
                password: None,
                header: None,
                value: None,
                access_token_url: Some(access_token_url),
                authorize_url: None,
                client_id: Some(client_id),
                client_secret: Some(client_secret),
                audience: Some(audience),
                scope: Some(scope),
                selected_certificate: Some(selected_certificate),
                selected_proxy: Some(selected_proxy),
                send_credentials_in_body: Some(send_credentials_in_body),
                validation_warnings: Some(validation_warnings.unwrap_or_default()),
            },
            AuthorizationPlain::OAuth2Pkce {
                id,
                name,
                authorize_url,
                access_token_url,
                client_id,
                scope,
                send_credentials_in_body,
                validation_warnings,
                ..
            } => AuthorizationUpdate {
                id,
                entity_type: EntityType::Authorization,
                encrypted: Some(false),
                auth_type: Some(AuthorizationUpdateType::OAuth2Pkce),
                name: Some(name),
                username: None,
                password: None,
                header: None,
                value: None,
                access_token_url: Some(access_token_url),
                authorize_url: Some(authorize_url),
                client_id: Some(client_id),
                client_secret: None,
                audience: None,
                scope: Some(scope),
                selected_certificate: None,
                selected_proxy: None,
                send_credentials_in_body: Some(send_credentials_in_body),
                validation_warnings: Some(validation_warnings.unwrap_or_default()),
            },
            AuthorizationPlain::ApiKey {
                id,
                name,
                header,
                value,
                validation_warnings,
                ..
            } => AuthorizationUpdate {
                id,
                entity_type: EntityType::Authorization,
                encrypted: Some(false),
                auth_type: Some(AuthorizationUpdateType::ApiKey),
                name: Some(name),
                username: None,
                password: None,
                header: Some(header),
                value: Some(value),
                access_token_url: None,
                authorize_url: None,
                client_id: None,
                client_secret: None,
                audience: None,
                scope: None,
                selected_certificate: None,
                selected_proxy: None,
                send_credentials_in_body: None,
                validation_warnings: Some(validation_warnings.unwrap_or_default()),
            },
        }
    }
}
