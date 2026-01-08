//! PKCE support submodule
//!

use std::thread::JoinHandle;

use actix_web::{
    App, HttpRequest, HttpResponse, HttpServer, Result,
    dev::ServerHandle,
    get,
    http::StatusCode,
    web::{self, Data, Query},
};
use apicize_lib::{
    PkceTokenResult,
    oauth2_pkce::{generate_authorization, refresh_token, retrieve_access_token},
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Url};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PkceAuthParams {
    code: String,
    state: String,
}

// #[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
// /// Anticipated response from PKCE redirect
// struct OAuth2PkceResponse {
//     /// ID token (Not really used)
//     id_token: Option<String>,
//     /// Access Token
//     access_token: String,
//     /// Expiration (if any)
//     expires_in: Option<u32>,
//     /// Token type
//     token_type: Option<String>,
// }

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
/// PKCE authorization info
pub struct OAuth2PkceInfo {
    authorize_url: String,
    access_token_url: String,
    client_id: String,
    send_credentials_in_body: Option<bool>,
    scope: Option<String>,
    audience: Option<String>,
}

/// Inflight PKCE request
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OAuth2PkceRequest {
    url: Url,
    csrf_token: String,
    verifier: String,
    redirect_url: String,
}

pub struct OAuth2PkceService {
    tauri: AppHandle,
    port: Option<u16>,
    stop: Option<web::Data<StopHandle>>,
    server: Option<JoinHandle<Result<(), std::io::Error>>>,
}

#[derive(Clone)]
struct OAuth2PkceServiceData {
    tauri: AppHandle,
}

impl OAuth2PkceService {
    pub fn new(app_handle: AppHandle) -> Self {
        OAuth2PkceService {
            tauri: app_handle,
            stop: None,
            server: None,
            port: None,
        }
    }

    /// Activate a PKCE listener on the specified port
    pub fn activate_listener(&mut self, port: u16) {
        if let Some(active_port) = self.port {
            // If already listening at the correct port, we're good
            if active_port == port {
                return;
            }
        }

        self.port = Some(port);

        if port == 0 {
            println!("*** PKCE listener is disabled ***");
            return;
        }

        let stop_handle = self.stop.take();
        let server = self.server.take();

        if let Some(h) = stop_handle {
            h.stop(false);
        }

        if let Some(s) = server
            && let Err(err) = s.join()
        {
            self.tauri
                .emit("oauth2-pkce-error", format!("{err:?}"))
                .unwrap();
        }

        let app_handle = self.tauri.clone();
        let stop_handle = web::Data::new(StopHandle::default());
        let cloned_stop_handle = stop_handle.clone();

        self.server = Some(std::thread::spawn(move || {
            init_pkce_server(app_handle, port, cloned_stop_handle)
        }));
        self.stop = Some(stop_handle);
    }

    /// Generate
    pub fn generate_authorization_info(
        &self,
        auth: OAuth2PkceInfo,
        port: u16,
    ) -> Result<OAuth2PkceRequest, String> {
        if port == 0 {
            return Err("PKCE port is set to 0 in settings, disabling PKCE".to_string());
        }
        let redirect_uri = format!("http://localhost:{port}");
        match generate_authorization(
            auth.authorize_url.as_str(),
            redirect_uri.as_str(),
            auth.client_id.as_str(),
            auth.send_credentials_in_body.unwrap_or(false),
            auth.scope,
            auth.audience,
        ) {
            Ok((url, csrf_token, verifier)) => Ok(OAuth2PkceRequest {
                url,
                csrf_token: csrf_token.into_secret(),
                verifier,
                redirect_url: redirect_uri,
            }),
            Err(err) => Err(format!("{err:?}")),
        }
    }

    /// Exchange code for access token
    pub async fn retrieve_access_token(
        token_url: &str,
        redirect_url: &str,
        code: &str,
        client_id: &str,
        verifier: &str,
    ) -> Result<PkceTokenResult, String> {
        retrieve_access_token(token_url, redirect_url, client_id, code, verifier, true).await
    }

    // Exchange refresh token for access token
    pub async fn refresh_token(
        token_url: &str,
        refresh_token1: &str,
        client_id: &str,
    ) -> Result<PkceTokenResult, String> {
        refresh_token(token_url, refresh_token1, client_id).await
    }
}

#[actix_web::main]
async fn init_pkce_server(
    tauri: AppHandle,
    port: u16,
    stop_handle: Data<StopHandle>,
) -> Result<(), std::io::Error> {
    let app_data = web::Data::new(OAuth2PkceServiceData {
        tauri: tauri.clone(),
    });

    let http_server = HttpServer::new(move || {
        App::new()
            .app_data(app_data.clone())
            .service(process_pkce_response)
    })
    .bind(("127.0.0.1", port));

    match http_server {
        Ok(server) => {
            tauri
                .emit(
                    "oauth2-pkce-success",
                    format!("Server started at http://127.0.0.1:{port}").to_string(),
                )
                .unwrap();
            println!("*** Started PKCE listener at 127.0.0.1:{port}");
            let running_server = server.run();
            stop_handle.register(running_server.handle());
            running_server.await
        }
        Err(err) => {
            tauri
                .emit(
                    "oauth2-pkce-error",
                    format!("Unable to start server at http://127.0.0.1:{port}, {err}"),
                )
                .unwrap();
            eprintln!("Unable to start server at http://127.0.0.1:{port}, {err}");
            Err(err)
        }
    }
}

fn close_pkce_windows(app: &AppHandle) {
    for (lbl, window) in app.webview_windows() {
        if lbl.starts_with("apicize-pkce-") {
            window.destroy().unwrap();
        }
    }
}

#[get("/")]
async fn process_pkce_response(
    (request, data): (HttpRequest, Data<OAuth2PkceServiceData>),
) -> Result<HttpResponse, actix_web::Error> {
    close_pkce_windows(data.tauri.app_handle());
    if let Ok(params) = Query::<PkceAuthParams>::from_query(request.query_string()) {
        // Get query string....
        // ?code=0b32dbe7-30f7-433b-9f81-05e8851627ab&state=aaabbbccc
        data.tauri
            .emit("oauth2-pkce-auth-response", params.0)
            .unwrap();
        Ok(HttpResponse::new(StatusCode::OK))
    } else {
        Ok(HttpResponse::new(StatusCode::BAD_REQUEST))
    }
}

#[derive(Default)]
struct StopHandle {
    inner: parking_lot::Mutex<Option<ServerHandle>>,
}

impl StopHandle {
    /// Sets the server handle to stop.
    pub(crate) fn register(&self, handle: ServerHandle) {
        *self.inner.lock() = Some(handle);
    }

    /// Sends stop signal through contained server handle.
    pub(crate) fn stop(&self, graceful: bool) {
        if let Some(h) = self.inner.lock().as_ref() {
            #[allow(clippy::let_underscore_future)]
            let _ = h.stop(graceful);
        }
    }
}
